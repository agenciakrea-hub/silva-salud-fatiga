PRUEBAS.grupo('P085 · las dos acciones que no autenticaban');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Dos agujeros distintos, con la misma raíz: alguien miró si la función pedía contraseña y dio el
   punto por cerrado. Pedir contraseña es la mitad — la otra mitad es qué devuelve y a quién.

   1 · `accionTieneClave` NO PEDÍA NADA. Un booleano por pedido, sin credencial, sin código de
       empresa y sin freno. Repetido en un `for` sobre cédulas, eso es la lista de quién tiene
       cuenta. Y peor: la empresa se pasaba cruda a `credBuscar`, que filtra con `if (emp && …)` —
       o sea que con la empresa VACÍA buscaba esa cédula en TODAS las empresas del CH.

   2 · `accionIdentidadesInforme` SÍ pedía contraseña, y por eso pasó todas las revisiones. Lo que
       no hacía era acotar: con la clave de cualquier empresa devolvía el censo del sistema entero
       —cuánta gente, cuántas empresas, hasta 50 nombres con su empresa y hasta 50 filas con
       CÉDULA en limpio— de clientes que no tienen nada que ver con quien pregunta.

   ⚠️ POR QUÉ CADA CASO TIENE SU DISCRIMINADOR (R17). Una prueba de seguridad tiene una forma de
   mentir que las otras no: comprobar que "no llegó el dato de la otra empresa" pasa igual de bien
   si la respuesta viene vacía por un error del arnés. Un cero sin discriminador no es un
   resultado. Así que cada caso demuestra, en la misma corrida, que el dato SÍ estaba al alcance
   del endpoint y que lo único que lo detuvo fue el candado nuevo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Dos empresas de verdad distintas. La segunda lleva acento a propósito: `norm()` lo saca y
   `nominaEmpresaCanon` resuelve por alias, así que si el recorte se hiciera comparando texto
   crudo en algún lado, acá se vería. */
const P085_ACCESOS = [
  ['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
  ['Helitec', 'claveDeHelitec', 'supervisor', 'Helitec', '', ''],
  ['Cardón',  'claveDeCardon',  'supervisor', 'Cardón',  '', ''],
  ['*',       'claveDelAdmin',  'admin',      '',        '', '']
];

const P085_NOMINA = [
  ['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad',
   'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
  ['Helitec', 'Ana Suárez', 'V-111', 'Operaciones', 'Piloto',  'F', '34', '', '', 'Sí', '', '', '4'],
  ['Cardón',  'Bruno Lara', 'V-222', 'Planta',      'Operario', 'M', '40', '', '', 'No', '', '', '3']
];

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · `tiene_clave` — el oráculo de cédulas
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p085EntornoClave(config) {
  const env = GS.crearEntorno({
    'Accesos': P085_ACCESOS.map(f => f.slice()),
    'Nómina':  P085_NOMINA.map(f => f.slice()),
    'Credenciales': [['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo',
                      'Rol', 'Estado', 'Creada', 'UltimoAcceso']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']].concat(config || [])
  });
  const api = GS.cargarGs(CTX.gs, env,
    ['accionTieneClave', 'accionCredencialCrear', 'credPersonaMigrada', 'credBuscar']);
  /* La credencial de Ana se crea por el CAMINO REAL (R17), no escribiendo la fila a mano: si el
     alta cambiara de forma, esta prueba tiene que enterarse. Se crea ANTES de que exista el
     código de empresa en la config, para que ese paso no dependa de él. */
  api.__crearLaDeAna = function () {
    return JSON.parse(api.accionCredencialCrear({
      empresa: 'Helitec', cedula: 'V-111', pass: 'LaDeAna2026',
      dispositivoId: 'alta', codigo: (config || []).length ? 'HELI-2026' : ''
    }).getContent());
  };
  api.__preguntar = function (p) { return JSON.parse(api.accionTieneClave(p).getContent()); };
  return api;
}

PRUEBAS.caso('⚠️ SIN EMPRESA no se contesta nada — era una búsqueda global por cédula', () => {
  /* EL CASO MÁS IMPORTANTE DE LA MITAD 1. `credBuscar` filtra la empresa con `if (emp && …)`, así
     que con la empresa vacía NO filtra: recorre `Credenciales` entera. La función vieja le pasaba
     `p.empresa` tal cual, sin exigirla, así que `?action=tiene_clave&cedula=12345678` —un solo
     parámetro, sin credencial— contestaba si esa persona tiene cuenta en CUALQUIER cliente. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = p085EntornoClave();
  PRUEBAS.cierto(api.__crearLaDeAna().ok, 'guarda de medibilidad: la credencial de Ana se creó');

  const r = api.__preguntar({ cedula: 'V-111', dispositivoId: 'd1' });
  PRUEBAS.falso(r.ok, '⚠️ sin empresa la acción no responde');
  PRUEBAS.igual(r.migrada, undefined, '⚠️ y no se cuela un `migrada` en la respuesta de error');

  /* EL DISCRIMINADOR. Si esto no fuera cierto, el caso de arriba estaría pasando porque no hay
     nada que encontrar, no porque el candado funcione. `credBuscar` SIGUE pudiendo buscar en todo
     el CH —no se tocó, la usan `login` y `credencial_cambiar`, que ya llegan con empresa—: lo
     único que cambió es que la acción ya no la llama con la empresa vacía. */
  PRUEBAS.cierto(api.credPersonaMigrada('', 'V-111'),
    '⚠️ DISCRIMINADOR: la búsqueda global sigue existiendo bajo la acción. Si esto se pone en ' +
    'rojo, el caso de arriba dejó de probar algo y hay que rehacerlo');
});

PRUEBAS.caso('con SU empresa sí contesta — el alta y el login no se rompen', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoClave();
  api.__crearLaDeAna();
  const r = api.__preguntar({ empresa: 'Helitec', cedula: 'V-111', dispositivoId: 'd1' });
  PRUEBAS.cierto(r.ok, 'responde');
  PRUEBAS.igual(r.migrada, true, '⚠️ y dice que sí: cerrar el agujero no puede dejar sin login a Ana');
});

PRUEBAS.caso('⚠️ CRUZADA · la empresa B no puede preguntar por una cédula de la empresa A', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoClave();
  api.__crearLaDeAna();
  const ajena = api.__preguntar({ empresa: 'Cardón', cedula: 'V-111', dispositivoId: 'dX' });
  PRUEBAS.igual(ajena.migrada, false,
    '⚠️ preguntando desde otra empresa, la cédula de Ana no existe');
  /* DISCRIMINADOR: la MISMA cédula, con la empresa correcta y desde otro dispositivo (para que el
     freno del intento fallido de arriba no explique el resultado), tiene que dar true. Sin esto,
     un `migrada:false` constante haría pasar el caso sin recortar nada. */
  PRUEBAS.igual(api.__preguntar({ empresa: 'Helitec', cedula: 'V-111', dispositivoId: 'dY' }).migrada,
    true, '⚠️ DISCRIMINADOR: con la empresa correcta la misma cédula sí resuelve');
});

PRUEBAS.caso('⚠️ y la respuesta NO distingue "no existe" de "todavía no migró"', () => {
  /* Si contestara distinto, el oráculo volvería por la puerta de al lado: bastaría comparar las
     dos respuestas para saber quién está en la nómina. Beto está en la nómina y no tiene clave;
     V-999 no existe. Las dos respuestas tienen que ser IDÉNTICAS. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Accesos': P085_ACCESOS.map(f => f.slice()),
    'Nómina':  P085_NOMINA.map(f => f.slice())
                 .concat([['Helitec', 'Beto Pérez', 'V-333', 'Operaciones', 'Piloto', 'M', '30',
                           '', '', 'Sí', '', '', '4']]),
    'Credenciales': [['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo',
                      'Rol', 'Estado', 'Creada', 'UltimoAcceso']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionTieneClave']);
  const enNomina  = JSON.parse(api.accionTieneClave({ empresa: 'Helitec', cedula: 'V-333', dispositivoId: 'd1' }).getContent());
  const inventada = JSON.parse(api.accionTieneClave({ empresa: 'Helitec', cedula: 'V-999', dispositivoId: 'd2' }).getContent());
  PRUEBAS.igual(JSON.stringify(enNomina), JSON.stringify(inventada),
    '⚠️ las dos respuestas tienen que ser byte por byte la misma — cualquier diferencia es el ' +
    'oráculo reabierto');
  PRUEBAS.igual(enNomina.migrada, false, 'y las dos dicen que no hay clave propia');
});

PRUEBAS.caso('⚠️ el CÓDIGO DE EMPRESA cierra la puerta, igual que en `nomina_personas`', () => {
  /* No se inventa una barrera nueva: es la misma `puertaCodigo` que ya protege la lista de
     nombres, la confirmación de cédula y el alta de credencial. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoClave([['Helitec', 'codigoRegistro', 'HELI-2026']]);
  PRUEBAS.cierto(api.__crearLaDeAna().ok, 'guarda: con el código, el alta funciona');

  const sinCodigo = api.__preguntar({ empresa: 'Helitec', cedula: 'V-111', dispositivoId: 'd1' });
  PRUEBAS.falso(sinCodigo.ok, '⚠️ sin el código de la empresa, no se contesta');
  PRUEBAS.igual(sinCodigo.motivo, 'codigo_invalido', 'y se dice por qué, como en el resto del alta');

  /* El código va con espacios de más y en minúscula a propósito: `normCodigo` saca los espacios y
     pasa a mayúscula, pero NO toca el guion — la persona lo escribe como se lo pasaron, y lo que
     no se tolera es que sea otro código. (La primera versión de este caso mandaba "heli 2026" y
     fallaba: el guion sí cuenta. Queda escrito para no volver a suponerlo.) */
  const conCodigo = api.__preguntar({ empresa: 'Helitec', cedula: 'V-111',
                                      codigo: '  heli-2026  ', dispositivoId: 'd2' });
  PRUEBAS.igual(conCodigo.migrada, true,
    '⚠️ DISCRIMINADOR: con el código correcto sí contesta (y tolerante a espacios y mayúsculas, ' +
    'igual que `normCodigo` en todo el resto)');
});

PRUEBAS.caso('⚠️ el BARRIDO se frena — es lo que convertía un booleano en una lista', () => {
  /* Un booleano por pedido no es una fuga. Un booleano que se puede pedir infinitas veces, sí:
     `for (ced = 1; ced < 30000000; ced++)` devuelve la nómina. El freno es por DISPOSITIVO y con
     clave propia (`__tieneclave__`), para no quemarle los intentos ni al login ni a la demo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoClave();
  api.__crearLaDeAna();

  /* DISCRIMINADOR, y va PRIMERO a propósito: antes de barrer, ese mismo dispositivo obtiene la
     respuesta verdadera. Así el `false` de después no se puede explicar por otra cosa. */
  PRUEBAS.igual(api.__preguntar({ empresa: 'Helitec', cedula: 'V-111', dispositivoId: 'barredor' }).migrada,
    true, '⚠️ DISCRIMINADOR: antes de barrer, el dispositivo recibe la respuesta real');

  for (let i = 0; i < 6; i++) {
    api.__preguntar({ empresa: 'Helitec', cedula: 'V-9' + i + '0', dispositivoId: 'barredor' });
  }
  PRUEBAS.igual(api.__preguntar({ empresa: 'Helitec', cedula: 'V-111', dispositivoId: 'barredor' }).migrada,
    false, '⚠️ después de seis cédulas que no están, ese dispositivo deja de recibir respuestas ' +
           'útiles — incluso para una cédula real');
  PRUEBAS.igual(api.__preguntar({ empresa: 'Helitec', cedula: 'V-111', dispositivoId: 'otro-telefono' }).migrada,
    true, '⚠️ y el freno es por dispositivo: quien barre no puede dejar afuera a nadie más');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · `identidades_informe` — el censo global
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La identidad viaja por `PVT`, que tiene una sola fila de encabezado y once columnas, en vez de
   por `Respuestas de formulario 1`, que tiene dos filas de encabezado y noventa columnas. El
   informe mira los dos arrays igual (`datos.registros.concat(datos.pvt)`), así que se ejercita el
   mismo camino con una décima parte del andamiaje.
   Las filas "Ana" y "Bruno" (sin apellido) son variantes que el padrón NO conoce: son las que caen
   en `sinResolver` y generan `candidatos` — que es donde salían las cédulas ajenas. */
function p085EntornoInforme() {
  const env = GS.crearEntorno({
    'Accesos': P085_ACCESOS.map(f => f.slice()),
    'Nómina':  P085_NOMINA.map(f => f.slice()),
    'Registrados Fatiga': [
      ['Fecha', 'Marca', 'Nombre', 'Email', 'Cédula', 'IdPiloto', 'EsPiloto', 'EsSupervisor',
       'Empresa', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono'],
      ['2026-09-01', '', 'Ana Suárez', 'ana@x.com', 'V-111', '', 'Sí', 'No', 'Helitec', 'Operaciones', 'Piloto', 'F', '34', ''],
      ['2026-09-01', '', 'Bruno Lara', 'bruno@x.com', 'V-222', '', 'No', 'No', 'Cardón', 'Planta', 'Operario', 'M', '40', '']
    ],
    'Identidades': [['Variante', 'Empresa', 'Cedula', 'ResueltoPor', 'Como', 'Registros', 'PrimeraVez', 'UltimaVez']],
    // Dos filas de encabezado y nada más: `parseRegistros` devuelve [] y el informe trabaja sobre PVT.
    'Respuestas de formulario 1': [['Marca temporal', 'Nombre', 'Departamento'], ['', '', '']],
    'PVT': [
      ['Fecha', 'Nombre', 'Empresa', 'Departamento', 'Validas', 'RT prom', 'RT min', 'RT max', 'Lapsos', 'RT mediana', 'Falsos'],
      ['2026-09-04', 'Ana Suárez', 'Helitec', 'Operaciones', 30, 300, 200, 400, 0, 290, 0],
      ['2026-09-04', 'Ana',        'Helitec', 'Operaciones', 30, 305, 200, 400, 0, 295, 0],
      ['2026-09-04', 'Bruno Lara', 'Cardón',  'Planta',      30, 310, 210, 410, 0, 300, 0],
      ['2026-09-04', 'Bruno',      'Cardón',  'Planta',      30, 315, 210, 410, 0, 305, 0]
    ]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionIdentidadesInforme', 'construirResolutor']);
  api.__informe = function (p) { return JSON.parse(api.accionIdentidadesInforme(p).getContent()); };
  return api;
}

/* Todo lo que puede llevar el rastro de la otra empresa, en un solo string. Se serializa la
   respuesta ENTERA a propósito: buscar campo por campo dejaría pasar el día que alguien agregue
   uno nuevo al informe, que es exactamente cómo apareció este agujero. */
function p085Rastro(r) { return JSON.stringify(r); }

PRUEBAS.caso('⚠️ un supervisor NO recibe ni una cédula, ni un nombre, ni un conteo de otra empresa', () => {
  /* EL CASO MÁS IMPORTANTE DE LA MITAD 2. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoInforme();
  const r = api.__informe({ usuario: 'Helitec', pass: 'claveDeHelitec', dispositivoId: 'd1' });
  PRUEBAS.cierto(r.ok, 'guarda de medibilidad: el informe se arma (si esto es false, no se midió nada)');

  const texto = p085Rastro(r);
  PRUEBAS.falso(/Cardón|Cardon/.test(texto), '⚠️ no aparece la empresa ajena en ningún campo');
  PRUEBAS.falso(/Bruno/.test(texto),         '⚠️ ni el nombre de nadie de esa empresa');
  PRUEBAS.falso(/222/.test(texto),           '⚠️ ni su cédula — que era lo más grave de la fuga');
  PRUEBAS.igual(r.enPadron, 1, '⚠️ `enPadron` cuenta SÓLO su padrón, no el del sistema');
  PRUEBAS.igual(r.alcance, ['Helitec'], 'y el informe dice qué está mirando');

  /* Y lo que sí tiene que llegar: su propia gente. Un recorte que además rompa el informe no es
     un arreglo, es una pantalla menos. */
  PRUEBAS.cierto(/Ana/.test(texto), 'su propia gente sí llega');
  PRUEBAS.igual(r.registros.antes, 2, 'las dos filas de PVT de Helitec, y sólo esas');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · el dato de la otra empresa SÍ estaba al alcance del endpoint', () => {
  /* Sin este caso, el de arriba pasaría igual con un arnés roto: si `leerDatos` devolviera vacío,
     o el padrón no se armara, "no aparece Cardón" sería cierto y no probaría nada.
     Dos comprobaciones, y las dos hacen falta:
       · el padrón interno SIGUE teniendo la cédula de Cardón (el resolutor la necesita para
         resolver nombres, y eso no se tocó);
       · el ADMIN, por el mismo camino y con los mismos datos, la recibe. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoInforme();

  const padron = api.construirResolutor().padron.porCedula;
  PRUEBAS.cierto(!!padron['222'],
    '⚠️ la cédula de Cardón está en el padrón que el endpoint arma: lo único que la deja afuera ' +
    'de la respuesta es el recorte nuevo');

  const admin = api.__informe({ usuario: '*', pass: 'claveDelAdmin', dispositivoId: 'd2' });
  PRUEBAS.cierto(admin.ok, 'el admin entra');
  PRUEBAS.igual(admin.alcance, 'todas', 'y su alcance es todo el sistema');
  PRUEBAS.igual(admin.enPadron, 2, '⚠️ el admin sí ve las dos personas — o sea que el informe mide');
  PRUEBAS.cierto(/Bruno/.test(p085Rastro(admin)),
    '⚠️ y sí recibe el nombre de la otra empresa: la diferencia entre los dos casos es el permiso, ' +
    'no un informe vacío');
});

PRUEBAS.caso('⚠️ y no alcanza con MANDAR otra empresa en el pedido', () => {
  /* La forma barata de saltarse un recorte mal hecho: autenticarse con lo propio y pedir lo ajeno
     por parámetro. Es lo que hacen hoy otras acciones del archivo (`p.empresa || acc.canonical`),
     así que no es una preocupación teórica en este código. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoInforme();
  const r = api.__informe({ usuario: 'Helitec', pass: 'claveDeHelitec',
                            empresa: 'Cardón', dispositivoId: 'd3' });
  PRUEBAS.cierto(r.ok, 'guarda: el pedido se responde igual');
  PRUEBAS.falso(/222|Bruno|Cardón|Cardon/.test(p085Rastro(r)),
    '⚠️ el alcance sale de la fila de `Accesos`, nunca de lo que mande el cliente');
  PRUEBAS.igual(r.enPadron, 1, 'sigue viendo sólo lo suyo');
});

PRUEBAS.caso('⚠️ sin credencial no se responde nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p085EntornoInforme();
  const r = api.__informe({ usuario: 'Helitec', pass: 'la-que-no-es', dispositivoId: 'd4' });
  PRUEBAS.falso(r.ok, 'con la contraseña mal, no');
  const sinNada = api.__informe({ dispositivoId: 'd5' });
  PRUEBAS.falso(sinNada.ok, 'y sin nada, tampoco');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   3 · `medir_hash` — el comentario que decía "administrador" y no lo pedía
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ `medir_hash` ahora sí pide administrador, como decía su propio comentario', () => {
  /* No es la fuga más cara del archivo, pero es el tipo de comentario que hace daño: quien revisa
     lee "🔒 pide credenciales de administrador", da el punto por cerrado y sigue. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({ 'Accesos': P085_ACCESOS.map(f => f.slice()) });
  const api = GS.cargarGs(CTX.gs, env, ['accionMedirHash']);
  const sup = JSON.parse(api.accionMedirHash({ usuario: 'Helitec', pass: 'claveDeHelitec',
                                               vueltas: 5, dispositivoId: 'd1' }).getContent());
  PRUEBAS.falso(sup.ok, '⚠️ la clave de un supervisor cualquiera ya no abre esto');
  /* DISCRIMINADOR: con el admin tiene que funcionar de verdad y devolver una medición, no un
     `ok:true` vacío. Sin esto, un `ok:false` para todo el mundo pasaría el caso de arriba. */
  const adm = JSON.parse(api.accionMedirHash({ usuario: '*', pass: 'claveDelAdmin',
                                               vueltas: 5, dispositivoId: 'd2' }).getContent());
  PRUEBAS.cierto(adm.ok, '⚠️ DISCRIMINADOR: el admin sí mide');
  PRUEBAS.igual(adm.vueltas, 5, 'y la medición es real, no un ok de adorno');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   4 · LO QUE NO PUEDE VOLVER A ROMPERSE: el alta
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ EL ALTA SIGUE VIVA · `nomina_empresas` y `nomina_personas` sin contraseña', () => {
  /* Estas dos son el camino de entrada de toda la app: si se rompen, NADIE puede darse de alta.
     Van sin contraseña a propósito —el alta ocurre antes de tener credenciales— y este caso está
     acá para que ningún prompt de seguridad futuro las cierre "por las dudas". */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Accesos': P085_ACCESOS.map(f => f.slice()),
    'Nómina':  P085_NOMINA.map(f => f.slice()),
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'Registrados Fatiga': [['Fecha', 'Marca', 'Nombre', 'Email', 'Cédula']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaEmpresas', 'accionNominaPersonas']);

  const emps = JSON.parse(api.accionNominaEmpresas({}).getContent());
  PRUEBAS.cierto(emps.ok, 'la lista de empresas responde SIN contraseña');
  PRUEBAS.igual((emps.empresas || []).slice().sort(), ['Cardón', 'Helitec'],
    '⚠️ y trae las dos empresas: es el primer selector que ve alguien que se da de alta');
  PRUEBAS.igual((emps.perfiles || []).length, 2, 'con su perfil público en el mismo orden');

  const pers = JSON.parse(api.accionNominaPersonas({ empresa: 'Helitec', dispositivoId: 'd1' }).getContent());
  PRUEBAS.cierto(pers.ok, 'la lista de personas responde SIN contraseña');
  PRUEBAS.igual((pers.personas || []).map(x => x.nombre), ['Ana Suárez'],
    '⚠️ sólo la gente de esa empresa, y con nombre — sin esto el alta no puede continuar');
});
