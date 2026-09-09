PRUEBAS.grupo('P152 · el override auto-escrito no puede unificar homónimos');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `construirPadron` saca del índice por nombre a cualquiera que tenga homónimo, y su comentario
   dice por qué: «preferimos dejar dos personas separadas (y reportarlo) antes que juntar los datos
   clínicos de dos personas distintas por llamarse igual».

   `resolver()` pasaba por encima de esa guarda con un `||`: `overrides[k] || padron.porNombre[k]`.
   Y `leerOverridesIdentidad` tomaba como override CUALQUIER fila de `Identidades` con cédula —
   incluidas las que el propio endpoint se auto-escribe, que `anotarVariantes` marca con
   `ResueltoPor = "exacto"`. Su comentario decía «overrides que un humano escribió a mano»; no era
   lo que hacía.

   El escenario que rompe, y es el que se prueba acá: mientras hay UN «José Rodríguez», su cédula se
   auto-escribe. Cuando se registra el de OTRA empresa, el padrón lo marca ambiguo y lo saca — pero
   el override viejo seguía devolviendo la cédula del primero, así que las filas del segundo salían
   con el nombre Y la cédula del primero. Dos personas de dos clientes, un solo historial.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): `construirResolutor().resolver(nombre, empresa)`, que es lo
   que el endpoint aplica a TODOS los arrays que devuelve. Leer `leerOverridesIdentidad` sola
   probaría la pieza; lo que estaba roto era cómo la usa el llamador.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P152_CED_A = '11111111';   // José Rodríguez de Consorcio HELITEC
const P152_CED_B = '22222222';   // José Rodríguez de Cardón

const P152_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
const P152_CAB_IDENT = ['Variante','Empresa','Cedula','ResueltoPor','Como','Registros','PrimeraVez','UltimaVez'];

function p152Reg(nombre, ced, empresa){
  const f = new Array(P152_CAB_REG.length).fill('');
  f[2] = nombre; f[4] = ced; f[8] = empresa; f[3] = 'x@x.com';
  return f;
}
function p152Env(fns, o){
  o = o || {};
  const reg = [P152_CAB_REG.slice(), p152Reg('José Rodríguez', P152_CED_A, 'Consorcio HELITEC')];
  /* El segundo homónimo aparece sólo cuando el caso lo pide: así se puede medir el ANTES (uno solo)
     y el DESPUÉS (dos) con el mismo entorno. */
  if (o.dosHomonimos) reg.push(p152Reg('José Rodríguez', P152_CED_B, 'Cardón'));
  const ident = [P152_CAB_IDENT.slice()];
  if (o.ident) o.ident.forEach(f => ident.push(f));
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec','',''],
                ['cardon','c2','supervisor','Cardón','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Registrados Fatiga': reg,
    'Identidades': ident,
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}

PRUEBAS.caso('🔴 con dos homónimos, el override AUTO-ESCRITO no le pone al segundo la cédula del primero', () => {
  /* La fila de Identidades es la que el propio endpoint dejó cuando había un solo José: variante,
     empresa del primero, su cédula, y `ResueltoPor = "exacto"` — la marca de que la dedujo la
     máquina, no una persona. */
  const api = p152Env(['construirResolutor'], {
    dosHomonimos: true,
    ident: [['José Rodríguez','Consorcio HELITEC', P152_CED_A, 'exacto','', '5','','']]
  });
  const R = api.construirResolutor();
  PRUEBAS.cierto((R.padron.ambiguos || []).length > 0,
    'guarda: el padrón detectó el homónimo · si no, no hay nada que medir · ' + JSON.stringify(R.padron.ambiguos));
  const b = R.resolver('José Rodríguez', 'Cardón');
  PRUEBAS.igual(b.cedula !== P152_CED_A, true,
    '⚠️ al José de Cardón NO se le pone la cédula del de HELITEC · antes quedaban unificados');
  PRUEBAS.igual(b.como, 'pendiente',
    'queda pendiente, que es el estado correcto: dos personas separadas y el diagnóstico lo reporta');
  PRUEBAS.igual(b.persona, 'José Rodríguez',
    'y conserva el nombre que escribió esa persona, sin heredar el del otro');
});

PRUEBAS.caso('🔒 y al PRIMERO tampoco se le mete la del segundo · la guarda vale para los dos', () => {
  const api = p152Env(['construirResolutor'], {
    dosHomonimos: true,
    ident: [['José Rodríguez','Cardón', P152_CED_B, 'exacto','', '3','','']]
  });
  const R = api.construirResolutor();
  const a = R.resolver('José Rodríguez', 'Consorcio HELITEC');
  PRUEBAS.igual(a.cedula !== P152_CED_B, true, '🔒 el de HELITEC no hereda la cédula del de Cardón');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR: con la fila de SU empresa, cada uno resuelve a la suya', () => {
  /* La hoja `Identidades` ya guardaba la columna `Empresa` y el lector la ignoraba. Con ella, dos
     homónimos de clientes distintos se resuelven bien — que es lo que un índice por nombre solo no
     puede hacer. Sin este caso, el arreglo podría ser simplemente «no resolver nunca a un
     homónimo», que rompería la función en vez de arreglarla. */
  const api = p152Env(['construirResolutor'], {
    dosHomonimos: true,
    ident: [['José Rodríguez','Consorcio HELITEC', P152_CED_A, 'exacto','', '5','',''],
            ['José Rodríguez','Cardón',            P152_CED_B, 'exacto','', '3','','']]
  });
  const R = api.construirResolutor();
  PRUEBAS.igual(R.resolver('José Rodríguez', 'Consorcio HELITEC').cedula, P152_CED_A,
    '⚠️ el de HELITEC resuelve a la suya');
  PRUEBAS.igual(R.resolver('José Rodríguez', 'Cardón').cedula, P152_CED_B,
    '⚠️ y el de Cardón a la suya · la columna Empresa es lo que los separa');
});

PRUEBAS.caso('🔒 SIN homónimo, el override humano sigue mandando sobre el padrón', () => {
  /* El otro lado: la función existe para que una persona pueda corregir lo que el padrón deduce
     mal. Si el arreglo hubiera anulado los overrides, esto se caería. `ResueltoPor` vacío es lo que
     deja `anotarVariantes` en una fila sin cédula — la que un humano completa a mano. */
  const api = p152Env(['construirResolutor'], {
    ident: [['Jose Rodriguez S','', '99999999', '', '', '2','','']]
  });
  const R = api.construirResolutor();
  const r = R.resolver('Jose Rodriguez S', 'Consorcio HELITEC');
  PRUEBAS.igual(r.cedula, '99999999', '🔒 la corrección a mano se aplica');
  PRUEBAS.igual(r.como, 'manual', 'y se reporta como manual, no como deducción del sistema');
});

PRUEBAS.caso('⚠️ una fila "exacto" SIN empresa ya no cuenta como afirmación humana', () => {
  /* Es el caso del dato congelado: el sistema se auto-escribió una cédula, después la Nómina la
     corrigió, y el override viejo seguía ganando por el `||` sin que ninguna pantalla dijera de
     dónde salía el número. */
  const api = p152Env(['construirResolutor'], {
    ident: [['José Rodríguez','', '77777777', 'exacto', '', '5','','']]
  });
  const R = api.construirResolutor();
  const r = R.resolver('José Rodríguez', 'Consorcio HELITEC');
  PRUEBAS.igual(r.cedula, P152_CED_A,
    '⚠️ manda el padrón, no la deducción vieja · quedó «' + r.cedula + '»');
  PRUEBAS.igual(r.como, 'exacto', 'y se reporta como lo que es: resuelto por el padrón');
});
