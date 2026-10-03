/* ── `niveles_set` · cargar la escala de riesgo de una empresa ──────────────────────────────────
   (2026-10-03)

   NACE DE UN INCIDENTE. Alguien reportó «hoy cargaron información de la empresa y no lo veo en la
   app». Medido contra producción: la hoja `Niveles Riesgo` tenía 7 filas y las 7 eran de
   `Empresa Demo`, así que `nivelRiesgoDeServer` caía al `NIVEL_DEFAULT_GS` de 3 para las **27
   personas** de las dos empresas reales. Y las dos habían llenado la columna `Nivel de riesgo` de
   su hoja de nómina —el único lugar donde pueden cargar algo, con un desplegable que el propio
   endpoint les pone— que NO gobierna nada: su único consumidor es `perfilDePersona`, el perfil que
   viaja al teléfono. O sea que la persona veía un número y su supervisor otro, para las 27.

   Y la causa de fondo: **no existía ninguna forma de cargar esa escala.** La hoja se declara «se
   carga a mano» (ver `HOJA_NIVELES`) y su única escritura en todo el archivo era el encabezado al
   crearla, más `sembrarNivelesDemo()`.

   ⚠️ EL NIVEL MUEVE LA TOLERANCIA OPERATIVA, no la referencia clínica — los dos conceptos están en
   el CLAUDE.md del proyecto y no se confunden. Por eso la tarea lleva el doble permiso de
   `reparar_pvt`: sin `aplicar=1` simula.

   ⚠️ R19 · cada derecho que se afirma acá nombra la función que lo concede. */

PRUEBAS.grupo('niveles_set · cargar la escala de riesgo');

const P215C_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P215C_SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];
/* ⚠️ EL ENCABEZADO REAL de `Niveles Riesgo` (`obtenerHojaNiveles`), con `Persona` CUARTA.
   `leerNivelesRiesgo` lee por índice fijo, y un fixture con las columnas en otro orden ya costó
   una medición en este proyecto: el nombre entraba como departamento y la métrica discriminaba por
   el motivo equivocado. R17. */
const P215C_NIV = ['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel'];

/* ⚠️ EL FORMULARIO HACE FALTA, y su ausencia me dio un rojo que casi leí como defecto: sin
   registros no hay `aptitud`, así que el caso que mide el nivel compara `[]` contra `[3]` y los
   SEIS mutantes «discriminaban» por esa misma falla en vez de por lo suyo. El arnés lo mostró
   porque imprime QUÉ comprobación se puso en rojo, no sólo cuántas.
   130 columnas y DOS filas de encabezado, como la hoja real (`parseRegistros` arranca en r=2 y lee
   por índices fijos: 0 fecha, 1 nombre, 2 departamento, 72 empresa, 73 fecha del test, 86 KSS). */
function p215cFormulario() {
  const cab = new Array(130).fill(''); cab[1] = 'Nombre'; cab[72] = 'Empresa';
  const d = new Date(), z = n => String(n).padStart(2, '0');
  const dmy = z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear();
  const f = new Array(130).fill('');
  f[0] = dmy; f[1] = 'JUAN PILOTO'; f[2] = 'Operaciones'; f[72] = 'Helitec'; f[73] = dmy; f[86] = '5';
  return [cab, cab.slice(), f];
}

function p215cEntorno(filasNiveles) {
  return GS.crearEntorno({
    'Respuestas de formulario 1': p215cFormulario(),
    /* la celda multi-variante es la de producción: el canónico es el PRIMERO */
    'Accesos': [P215C_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Helitec', 'clave-h', 'supervisor', 'Consorcio HELITEC, Helitec', '', '']],
    'Nómina': [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo'],
      ['Helitec', 'JUAN PILOTO', 'V-1', 'Operaciones', 'Piloto']],
    'Niveles Riesgo': [P215C_NIV].concat(filasNiveles || []),
    'Sesiones': [P215C_SES]
  });
}

PRUEBAS.caso('🔴 `niveles_set` SIMULA sin `aplicar=1` y no toca la hoja', () => {
  /* EL DERECHO, o más bien el freno: el doble permiso lo concede la propia `mantNivelSet`, con su
     parámetro `aplicar`, y es el mismo patrón que `reparar_pvt` y `reparar_piloto` usan para todo
     lo que escribe datos de personas. Una escala mal cargada cambia a qué distancia del límite se
     actúa sobre gente real: tiene que poder verse antes de aplicarse. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215cEntorno([]);
  const api = GS.cargarGs(CTX.gs, env, ['mantNivelSet', 'leerNivelesRiesgo']);
  const hoja = () => env.__libro.getSheetByName('Niveles Riesgo').getDataRange().getValues();
  PRUEBAS.igual(hoja().length - 1, 0, 'guarda: la hoja arranca sin filas de datos');

  const r = api.mantNivelSet('Helitec', 'Operaciones', 'Piloto', '', 4, false);
  /* LO QUE TIENE QUE CAMBIAR · informa qué haría, y lo dice */
  PRUEBAS.cierto(r.ok !== false, '🔴 la simulación responde ok');
  PRUEBAS.cierto(r.r.simulado === true, '🔴 y se declara SIMULADA, para que nadie la lea como aplicada');
  PRUEBAS.igual(r.r.accion, 'creada', '🔴 y dice qué haría: crear la fila');
  PRUEBAS.igual(r.r.nivel, 4, 'con el nivel pedido');
  /* LO QUE NO PUEDE CAMBIAR · la hoja sigue intacta */
  PRUEBAS.igual(hoja().length - 1, 0, '🔴 NO PUEDE CAMBIAR · la hoja sigue SIN filas: no escribió nada');
  PRUEBAS.igual(api.leerNivelesRiesgo().length, 0, '🔴 NO PUEDE CAMBIAR · y la lectura tampoco ve nada');
});

PRUEBAS.caso('🔴 con `aplicar=1` la escala la VE el supervisor y la usa `nivelRiesgoDeServer`', () => {
  /* EL DERECHO: el nivel del puesto lo decide `nivelRiesgoDeServer`, que lee la hoja
     `Niveles Riesgo` con la cascada `persona > cargo > departamento > general` y cae a
     `NIVEL_DEFAULT_GS` (3) si no encuentra nada. Y lo que el supervisor VE en su pantalla de
     niveles lo concede `nivelesParaAcceso_`, acotado por `empresasPermitidas_`.

     ⚠️ LA EMPRESA SE LE PASA CANONIZADA, y no es una elección libre: el llamador real
     (`armarAptitudServer`) le da `r0.empresa` de un registro que `RES.aplicar` ya canonizó — lo
     verifiqué por `accionSupervisor` con el CH real. Medir esta función con la variante cruda
     («Helitec») hace que la fila canónica no coincida y da un rojo FALSO: me pasó al escribir esto.

     ⚠️ LO QUE ESTE CASO NO MIDE: el efecto dentro de `aptitud`. Con un fixture mínimo
     `armarAptitudServer` no arma nada y el aserto comparaba `[]` contra `[3]` — y entonces los seis
     mutantes «discriminaban» por esa falla en vez de por lo suyo. El efecto de punta a punta está
     medido contra el CH REAL en `scratchpad/r6-nivelset2.js`: las 9 personas de Helitec pasan de
     `nivel: 3` a `nivel: 4` dentro de la aptitud del panel. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const abrir = cargar => {
    const env = p215cEntorno([]);
    const api = GS.cargarGs(CTX.gs, env, ['mantNivelSet', 'accionNivelesRiesgo', 'leerNivelesRiesgo',
      'nivelRiesgoDeServer', 'nominaEmpresaCanon', 'construirAlias']);
    if (cargar) api.mantNivelSet('Helitec', 'Operaciones', 'Piloto', '', 4, true);
    const n = (function () { try { return JSON.parse(api.accionNivelesRiesgo({ usuario: 'Helitec',
      pass: 'clave-h', dispositivoId: 'd', empresa: 'Helitec' }).getContent()); } catch (e) { return {}; } })();
    /* la empresa CANONIZADA, que es la que produce `RES.aplicar` */
    const canon = api.nominaEmpresaCanon(api.construirAlias(), 'Helitec');
    const usa = api.nivelRiesgoDeServer(api.leerNivelesRiesgo(), 'JUAN PILOTO', 'Operaciones', canon, 'Piloto');
    return { verPanel: (n.niveles || []).length, usa: usa, canon: canon };
  };
  const antes = abrir(false), despues = abrir(true);

  PRUEBAS.igual(antes.canon, 'Consorcio HELITEC',
    'guarda: la variante «Helitec» canoniza a «Consorcio HELITEC» — el escenario de producción');
  PRUEBAS.igual(antes.verPanel, 0, 'guarda: sin la fila, la pantalla de niveles está VACÍA (el síntoma reportado)');
  PRUEBAS.igual(antes.usa, 3, 'guarda: y el nivel cae al DEFAULT de 3, no al que la empresa declaró');

  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.igual(despues.verPanel, 1, '🔴 con la fila cargada, el supervisor YA la ve en su pantalla');
  PRUEBAS.igual(despues.usa, 4, '🔴 y el nivel que gobierna pasa a ser el 4 de la empresa: la tolerancia es la suya');
});

PRUEBAS.caso('🔴 UPSERT por `Empresa|Departamento|Cargo|Persona`, canonizando la empresa', () => {
  /* EL DERECHO: a qué empresa pertenece la fila lo decide `nominaEmpresaCanon`, y la clave de
     comparación es la MISMA que usa el lector (`norm()`, vía `nivelCoincideServer`). Si el escritor
     derivara distinto, encontraría la fila, la pisaría, respondería «actualizada» y el lector
     seguiría sin verla — es textualmente lo que le pasó a `mantConfigSet` antes de P159.
     R15: upsert, nunca append ciego. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215cEntorno([]);
  const api = GS.cargarGs(CTX.gs, env, ['mantNivelSet', 'leerNivelesRiesgo']);
  const hoja = () => env.__libro.getSheetByName('Niveles Riesgo').getDataRange().getValues();

  /* ⚠️ SE LEE ANTES DE ESCRIBIR, Y ESO ES LA MITAD DEL CASO. `leerNivelesRiesgo` cachea el
     resultado, así que si el caso no lee primero no hay nada cacheado — y entonces el mutante que
     le saca la invalidación al escritor pasa en VERDE, porque el cáché estaba vacío de todos modos.
     Me pasó: el caso daba verde con el invalidador borrado. Primero se calienta el cáché. */
  PRUEBAS.igual(api.leerNivelesRiesgo().length, 0, 'guarda: la lectura (que CACHEA) arranca en cero');

  const a = api.mantNivelSet('Helitec', 'Operaciones', 'Piloto', '', 4, true);
  PRUEBAS.igual(a.r.accion, 'creada', 'guarda: la primera la crea');
  PRUEBAS.igual(hoja().length - 1, 1, 'guarda: hay una fila');
  /* LO QUE TIENE QUE CAMBIAR · la empresa queda CANÓNICA aunque se pidiera por la variante */
  PRUEBAS.igual(String(hoja()[1][0]), 'Consorcio HELITEC',
    '🔴 pedí «Helitec» y la fila cae bajo el CANÓNICO: la misma clave con que `empresasPermitidas_` acota');

  /* la misma clave, por el OTRO alias y con otro nivel: actualiza, no duplica */
  const b = api.mantNivelSet('Consorcio HELITEC', 'Operaciones', 'Piloto', '', 5, true);
  PRUEBAS.igual(b.r.accion, 'actualizada', '🔴 la segunda ACTUALIZA: reconoce la fila por el otro alias');
  PRUEBAS.igual(b.r.nivelAnterior, '4', '🔴 y dice qué nivel pisó, para poder volver atrás');
  PRUEBAS.igual(hoja().length - 1, 1, '🔴 la hoja NO creció: un append ciego habría dejado dos reglas peleando');
  PRUEBAS.igual(api.leerNivelesRiesgo().length, 1,
    '🔴 y la lectura ve la fila: el cáché que calentamos arriba se invalidó');
  PRUEBAS.igual(api.leerNivelesRiesgo()[0].nivel, 5, '🔴 con el valor NUEVO, no el que estaba cacheado');

  /* LO QUE NO PUEDE CAMBIAR · una clave DISTINTA sí crea fila nueva */
  const c = api.mantNivelSet('Helitec', 'Mantenimiento', '', '', 4, true);
  PRUEBAS.igual(c.r.accion, 'creada', '🔴 NO PUEDE CAMBIAR · otro departamento es otra regla: se crea');
  PRUEBAS.igual(hoja().length - 1, 2, 'y la hoja tiene dos filas');
});

PRUEBAS.caso('🔴 lo que `niveles_set` RECHAZA, y la regla general se declara', () => {
  /* EL DERECHO: el rango 1–5 lo impone `mantNivelSet`, y es el mismo que `leerNivelesRiesgo`
     exige al leer (`if (!nivel || nivel < 1 || nivel > 5) continue`) y el mismo que el desplegable
     de la hoja de nómina ofrece (`NOMINA_HOJA_NIVELES`). Tres sitios, un rango. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215cEntorno([]);
  const api = GS.cargarGs(CTX.gs, env, ['mantNivelSet']);
  const hoja = () => env.__libro.getSheetByName('Niveles Riesgo').getDataRange().getValues();

  PRUEBAS.cierto(api.mantNivelSet('Helitec', '', 'Piloto', '', 0, true).ok === false, '🔴 nivel 0 se rechaza');
  PRUEBAS.cierto(api.mantNivelSet('Helitec', '', 'Piloto', '', 9, true).ok === false, '🔴 nivel 9 se rechaza');
  PRUEBAS.cierto(api.mantNivelSet('Helitec', '', 'Piloto', '', 'x', true).ok === false, '🔴 un nivel no numérico se rechaza');
  PRUEBAS.cierto(api.mantNivelSet('', '', 'Piloto', '', 4, true).ok === false, '🔴 sin empresa se rechaza');
  PRUEBAS.igual(hoja().length - 1, 0, '🔴 y NINGUNO de los cuatro rechazos escribió una fila');

  /* ⚠️ La fila sin departamento, sin cargo y sin persona es la regla GENERAL de la empresa, y
     `nivelRiesgoDeServer` la reconoce justamente por tener los tres vacíos: pisa a todo el que no
     tenga regla propia. Se permite —hace falta para dar de alta una empresa— pero la respuesta lo
     DICE, porque es la que más fácil se carga sin querer. */
  const g = api.mantNivelSet('Helitec', '', '', '', 3, false);
  PRUEBAS.cierto(g.r.esReglaGeneral === true,
    '🔴 una fila sin departamento, cargo ni persona se declara como la regla GENERAL de la empresa');
  const noG = api.mantNivelSet('Helitec', 'Operaciones', '', '', 3, false);
  PRUEBAS.falso(noG.r.esReglaGeneral,
    '🔴 NO PUEDE CAMBIAR · y una con departamento NO es general');
});
