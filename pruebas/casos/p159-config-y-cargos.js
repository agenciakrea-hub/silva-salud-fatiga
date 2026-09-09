PRUEBAS.grupo('P159 · Config Empresa y el cuarto homónimo');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Dos pares escritor/lector que derivaban distinto, en la hoja de configuración y en el cruce de
   cargos.

   1 · LA CLAVE de `Config Empresa`. `mantConfigSet` buscaba la fila con `norm(clave)`; los cuatro
       lectores comparaban la clave EXACTA. Con una fila escrita «AltaAbierta», el operador corre
       `config_set clave=altaAbierta valor=0` para CERRAR la ventana de alta, el escritor la
       encuentra, la pisa y responde «actualizada» — y el lector la indexa bajo «AltaAbierta», así
       que `cfg.altaAbierta` sigue sin existir y **la ventana queda abierta**. El operador cree que
       la cerró.
   2 · LA EMPRESA de la misma hoja. Dos lectores canonizaban con `nominaEmpresaCanon` y tres no: una
       fila cargada como «Helitec» era invisible para quien preguntaba por «Consorcio HELITEC». Se
       perdían en silencio `zonaHoraria` —que define qué día es «hoy» para el ciclo—, `cicloPlan` y
       `persistencia`, cada uno cayendo a su default sin avisar.
   3 · EL CARGO. Cuarto cruce por nombre solo, y el único que no mueve un dato de contacto: mueve el
       CARGO, y el cargo decide el nivel de riesgo del puesto. Con dos homónimos, a uno se lo
       evaluaba con la tolerancia operativa del puesto del otro.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P159_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];

function p159Reg(nombre, empresa, cargo){
  const f = new Array(P159_CAB_REG.length).fill('');
  f[2] = nombre; f[8] = empresa; f[10] = cargo; f[3] = 'x@x.com';
  return f;
}
function p159Env(fns, cfg){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','EMPRESAS','Contraseña Médica','Contraseña HSQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec','',''],
                ['cardon','c2','supervisor','Cardón','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Registrados Fatiga': [P159_CAB_REG.slice(),
      p159Reg('José Rodríguez','Consorcio HELITEC','Piloto'),
      p159Reg('José Rodríguez','Cardón','Operario de planta')],
    'Config Empresa': [['Empresa','Clave','Valor']].concat(cfg || []),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}

PRUEBAS.caso('🔴 la ventana de alta se CIERRA de verdad aunque la clave esté escrita distinto', () => {
  /* La fila la escribió una persona como «AltaAbierta». El operador manda la clave en camelCase,
     como dice el manual. Antes: el escritor la pisaba y el lector no la veía. */
  const api = p159Env(['mantConfigSet','leerConfigEmpresa'],
                      [['Consorcio HELITEC','AltaAbierta','1']]);
  api.mantConfigSet('Consorcio HELITEC', 'altaAbierta', '0');
  const cfg = api.leerConfigEmpresa('Consorcio HELITEC');
  PRUEBAS.igual(String(cfg.altaAbierta), '0',
    '⚠️ el lector la ve bajo la clave canónica · antes quedaba en «AltaAbierta» y la ventana abierta');
});

PRUEBAS.caso('⚠️ y no se duplica la fila · el escritor encuentra la que ya estaba', () => {
  const api = p159Env(['mantConfigSet'], [['Consorcio HELITEC','AltaAbierta','1']]);
  api.mantConfigSet('Consorcio HELITEC', 'altaAbierta', '0');
  const v = api.__env.__libro.getSheetByName('Config Empresa').getDataRange().getValues();
  PRUEBAS.igual(v.length, 2, '⚠️ sigue habiendo una sola fila de configuración');
});

PRUEBAS.caso('🔴 una fila cargada bajo un ALIAS se lee igual · era `zonaHoraria` perdiéndose', () => {
  /* La fila dice «Helitec»; el llamador pregunta por «Consorcio HELITEC». Dos lectores canonizaban
     y tres no, así que la misma hoja respondía distinto según qué clave le pidieras. */
  const api = p159Env(['leerConfigEmpresa','valorConfigPropio'],
                      [['Helitec','zonaHoraria','America/Caracas']]);
  const cfg = api.leerConfigEmpresa('Consorcio HELITEC');
  PRUEBAS.igual(cfg.zonaHoraria, 'America/Caracas',
    '⚠️ la fila del alias se encuentra · antes se perdía y el ciclo caía al default sin avisar');
  PRUEBAS.igual(api.valorConfigPropio('Consorcio HELITEC', 'zonaHoraria'), 'America/Caracas',
    'y el otro lector también, con la misma derivación');
});

PRUEBAS.caso('🔒 el DISCRIMINADOR: la config de OTRA empresa no se cuela', () => {
  /* Si el arreglo canonizara de más, Cardón vería la configuración de HELITEC. */
  const api = p159Env(['leerConfigEmpresa'], [['Helitec','zonaHoraria','America/Caracas']]);
  const cfg = api.leerConfigEmpresa('Cardón');
  PRUEBAS.igual(cfg.zonaHoraria, undefined, '🔒 Cardón no ve la zona horaria de HELITEC');
});

PRUEBAS.caso('🔴 el CARGO es el de SU empresa · decide el nivel de riesgo del puesto', () => {
  /* Cuarto cruce por nombre solo. Con homónimos, a uno se lo evaluaba con la tolerancia operativa
     del puesto del otro. */
  const api = p159Env(['marcarCargos']);
  const regs = [{ persona:'José Rodríguez', empresa:'Consorcio HELITEC' },
                { persona:'José Rodríguez', empresa:'Cardón' }];
  api.marcarCargos(regs);
  PRUEBAS.igual(regs[0].cargo, 'Piloto', '⚠️ el de HELITEC, con su cargo');
  PRUEBAS.igual(regs[1].cargo, 'Operario de planta', '⚠️ y el de Cardón con el suyo');
});

PRUEBAS.caso('⚠️ el respaldo: una fila SIN empresa sigue cruzando · es deuda, no regla', () => {
  const api = p159Env(['marcarCargos']);
  api.__env.__libro.getSheetByName('Registrados Fatiga').appendRow(p159Reg('Ana Vieja','','Instructora'));
  const regs = [{ persona:'Ana Vieja', empresa:'Consorcio HELITEC' }];
  api.marcarCargos(regs);
  PRUEBAS.igual(regs[0].cargo, 'Instructora', '⚠️ la fila sin empresa se usa como respaldo');
});
