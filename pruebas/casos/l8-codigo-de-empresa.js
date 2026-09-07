PRUEBAS.grupo('L8 · el código de empresa: dos formas de dejar a la empresa entera afuera');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Antes de exigir un código de registro hay que poder guardarlo y leerlo sin que se deforme. Las
   dos formas en que se deformaba dejaban a la EMPRESA ENTERA sin poder darse de alta, y las dos
   se ven perfectas en la planilla — que es lo peor, porque nadie sospecha de la celda:

   1 · AL LEER. `parsearValorConfig` numeriza cualquier valor que parezca número, así que "01234"
       vuelve como 1234 y `verificarCodigoEmpresa` le diría a todo el mundo que su código está mal.
       `codigoSupervisor` no sufre esto hoy sólo porque tiene letras: la casualidad no es defensa.
   2 · AL ESCRIBIR. `setValue("01234")` sobre una celda sin formato guarda el NÚMERO 1234. El cero
       se pierde en la PLANILLA, no en el código: leerlo crudo después ya no lo recupera. Es la
       misma lección de R15 que costó los teléfonos con `+` en la Nómina y las fechas en Operacional.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function l8Env(filasConfig){
  return GS.crearEntorno({
    'Config Empresa': [["Empresa","Clave","Valor"]].concat(filasConfig || []),
  });
}

const L8_DIFICILES = [
  { v: '01234',      porque: 'ceros a la izquierda · el caso que motivó todo esto' },
  { v: '000',        porque: 'todo ceros' },
  { v: '1234',       porque: 'sólo dígitos, sin ceros · igual no debe volverse número' },
  { v: '12.50',      porque: 'con punto · `parseFloat` lo tomaría como decimal' },
  { v: 'HELI-2026',  porque: 'con guion, el formato recomendado' },
  { v: 'true',       porque: '⚠️ `parsearValorConfig` lo convierte en el BOOLEANO true' },
  { v: '{ABC}',      porque: '⚠️ empieza con llave: lo intentaría parsear como JSON' },
];

PRUEBAS.caso('🔴 un código con ceros a la izquierda se LEE tal cual', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, l8Env(
    L8_DIFICILES.map((d, i) => ['Empresa' + i, 'codigoRegistro', d.v])), ['valorConfigPropio']);
  L8_DIFICILES.forEach((d, i) => {
    const leido = api.valorConfigPropio('Empresa' + i, 'codigoRegistro');
    PRUEBAS.igual(String(leido), d.v,
      '⚠️ «' + d.v + '» vuelve igual · ' + d.porque + ' · volvió ' + JSON.stringify(leido));
  });
});

PRUEBAS.caso('el DISCRIMINADOR: una clave que NO es código sí se sigue interpretando', () => {
  /* Sin esto, el caso de arriba daría verde si alguien hubiera desactivado `parsearValorConfig`
     para todo — y eso rompería `anonN`, `persistencia` y los umbrales, que sí son números. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l8Env([['E', 'anonN', '5'], ['E', 'casosOdoo', 'true']]),
                          ['valorConfigPropio']);
  PRUEBAS.igual(api.valorConfigPropio('E', 'anonN'), 5,
    '⚠️ `anonN` sigue siendo un NÚMERO · el recorte crudo es sólo para los códigos');
  PRUEBAS.igual(api.valorConfigPropio('E', 'casosOdoo'), true,
    'y `casosOdoo` sigue siendo un booleano');
});

PRUEBAS.caso('🔴 R15 · al ESCRIBIR el código, la celda queda en texto plano', () => {
  /* El arreglo de lectura no alcanza: si Sheets ya guardó el número, el cero se perdió en la
     planilla. Se comprueba por el camino real, escribiendo con `mantConfigSet` y leyendo con
     `valorConfigPropio` — los dos lados del contrato, no cada uno por su lado (R17). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l8Env(), ['mantConfigSet', 'valorConfigPropio']);
  const r = api.mantConfigSet('Consorcio HELITEC', 'codigoRegistro', '01234');
  PRUEBAS.cierto(!!r && !!r.fila, 'guarda de medibilidad: se escribió la fila · ' + JSON.stringify(r));
  PRUEBAS.igual(String(api.valorConfigPropio('Consorcio HELITEC', 'codigoRegistro')), '01234',
    '⚠️ se guardó y se recuperó SIN perder el cero · el ida y vuelta completo, no cada mitad');

  /* Y actualizar una fila que ya existe tiene que conservar el formato igual. */
  api.mantConfigSet('Consorcio HELITEC', 'codigoRegistro', '00099');
  PRUEBAS.igual(String(api.valorConfigPropio('Consorcio HELITEC', 'codigoRegistro')), '00099',
    '⚠️ y al ACTUALIZAR una fila existente, también · son dos ramas distintas del código');
});

PRUEBAS.caso('⚠️ el código se compara sin importar espacios ni mayúsculas', () => {
  /* Alguien copia el código de un WhatsApp y se lleva un espacio al final, o el teclado del
     teléfono le pone la primera en mayúscula. Ninguna de las dos cosas puede dejarlo afuera. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l8Env([['E', 'codigoRegistro', 'HELI-2026']]),
                          ['verificarCodigoEmpresa']);
  [['HELI-2026', 'exacto'], ['heli-2026', 'en minúsculas'], [' HELI-2026 ', 'con espacios'],
   ['HELI-2026\n', 'con un salto de línea pegado']].forEach(([dado, como]) => {
    const r = api.verificarCodigoEmpresa('E', dado);
    PRUEBAS.cierto(r && r.ok, '⚠️ entra ' + como + ' · «' + dado.replace(/\n/g, '\\n') + '»');
  });
  PRUEBAS.falso(api.verificarCodigoEmpresa('E', 'HELI-2025').ok, 'y uno equivocado NO entra');
  PRUEBAS.falso(api.verificarCodigoEmpresa('E', '').ok, 'ni uno vacío');
});

PRUEBAS.caso('⚠️ una empresa SIN código cargado sigue abierta · hoy son todas', () => {
  /* Es lo que hace que el cambio de arriba sea seguro de publicar: mientras la celda esté vacía,
     `puertaCodigo` es transparente y nada cambia para las 7 personas de HELITEC. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l8Env([['E', 'sector', 'aviacion']]), ['verificarCodigoEmpresa']);
  const r = api.verificarCodigoEmpresa('E', '');
  PRUEBAS.falso(r.pide, '⚠️ sin código cargado no se pide nada · la puerta queda transparente');
  PRUEBAS.cierto(r.ok, 'y responde que sí, para no cortar el alta de nadie');
});
