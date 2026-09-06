
PRUEBAS.grupo('P094 · el CH usable: qué es cada hoja y cuáles se pueden tocar');

/* EL PROBLEMA no era que faltara documentación: es que **no había ninguna señal de qué se edita y
   qué no**. Las cinco hojas que un humano tiene que llenar están mezcladas entre diecisiete que la
   aplicación escribe sola, y ninguna lo decía. Alguien de RRHH que abre el archivo no tiene forma
   de saber si puede tocar `Operacional` o si va a romper algo.

   ⚠️ POR QUÉ NOTAS Y NO UNA FILA DE AYUDA ARRIBA — y esto es lo que estos casos protegen: todo el
   endpoint asume que la fila 1 es el encabezado y los datos empiezan en la 2 (`buscarFilaPorId`
   arranca literal en la fila 2). Insertar una fila dejaría el encabezado viejo leído como un dato:
   una persona fantasma llamada "Nombre y apellido" en `Nómina`. Las notas no tocan ni un byte. */

function p094Env(){
  return GS.crearEntorno({
    'Nómina':            [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                           "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"],
                          ["Helitec","Ana Suárez","V-1","Op","Piloto","F","34","+58412","a@x.com","Sí","","Empleado","4"]],
    'Accesos':           [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"]],
    'Config Empresa':    [["Empresa","Clave","Valor"]],
    'Niveles Riesgo':    [["Empresa","Departamento","Cargo","Persona","Nivel"]],
    'Marca':             [["Empresa","Nombre","Color","Logo"]],
    'Bitácora':          [["Fecha","Empresa","Accion","Sujeto","Actor","Rol","Origen","NivelRiesgo",
                           "UmbralAmarillo","UmbralRojo","AppVersion","IdEvento","JSON"]],
    'Operacional':       [["Fecha","Hora","ISO","IdEvento","Persona","Empresa","Departamento","Cargo",
                           "Evento","Test","Resultado","Plan"]],
    'Consentimientos':   [["Fecha","IdConsentimiento","Persona","Empresa","Cedula","Versiones","AppVersion"]],
  });
}

PRUEBAS.caso('⚠️ la nota de cada columna cae en SU columna, no en la de al lado', () => {
  /* Es la parte delicada. Si las notas se pusieran por posición fija, agregar una columna en el
     medio correría todas las explicaciones una a la derecha — y una nota que dice "sólo los
     números importan" sobre la columna Departamento es peor que no tener nota. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const env = p094Env();
  const api = GS.cargarGs(CTX.gs, env, ['documentarCH']);
  api.documentarCH();
  const nom = env.__libro.getSheetByName('Nómina');
  const cab = nom.getDataRange().getValues()[0];
  const iCed = cab.indexOf('Cédula') + 1, iTel = cab.indexOf('Teléfono') + 1;
  PRUEBAS.cierto(/números importan/i.test(nom.__notaDe(1, iCed) || ''),
    '⚠️ la nota de la cédula está sobre la columna Cédula');
  PRUEBAS.cierto(/fórmula|formula/i.test(nom.__notaDe(1, iTel) || ''),
    'y la del teléfono sobre Teléfono');
  PRUEBAS.igual(nom.__notaDe(1, cab.indexOf('Sexo') + 1), null,
    'y una columna sin nota documentada queda sin nota');
});

PRUEBAS.caso('el DISCRIMINADOR: el emulador registra las notas de verdad', () => {
  /* Sin esto, el caso de arriba podría dar verde porque TODO devuelve null y las regex fallan…
     o peor, porque nada se registra y nada se compara. */
  const env = p094Env();
  const sh = env.__libro.getSheetByName('Nómina');
  PRUEBAS.igual(sh.__notaDe(1, 1), null, 'antes, sin nota');
  sh.getRange(1, 1).setNote('hola');
  PRUEBAS.igual(sh.__notaDe(1, 1), 'hola', 'y después sí — o sea que la medición discrimina');
});

PRUEBAS.caso('⚠️ NINGÚN dato se mueve', () => {
  /* La razón por la que se eligieron notas y no una fila de ayuda. Si esto falla, el CH pierde
     datos de personas reales. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p094Env();
  const antes = JSON.stringify(env.__libro.getSheetByName('Nómina').__volcado());
  GS.cargarGs(CTX.gs, env, ['documentarCH']).documentarCH();
  const despues = JSON.stringify(env.__libro.getSheetByName('Nómina').__volcado());
  PRUEBAS.igual(despues, antes, '⚠️ la hoja quedó exactamente igual: sólo se agregaron notas');
});

PRUEBAS.caso('las cinco editables quedan arriba', () => {
  /* La otra mitad del valor. La pregunta de quien abre el archivo es "¿esto lo toco o no?", y el
     orden es lo que la contesta sin leer nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p094Env();
  GS.cargarGs(CTX.gs, env, ['documentarCH']).documentarCH();
  const orden = env.__libro.__orden();
  PRUEBAS.igual(orden[0], 'LÉEME', 'la guía primero');
  ['Nómina','Accesos','Config Empresa','Niveles Riesgo','Marca'].forEach(h => {
    const i = orden.indexOf(h);
    PRUEBAS.alMenos(i, 1, h + ' está en el orden');
    PRUEBAS.comoMucho(i, 5, '⚠️ ' + h + ' tiene que quedar entre las primeras: es editable');
  });
  ['Bitácora','Consentimientos'].forEach(h => {
    PRUEBAS.alMenos(orden.indexOf(h), orden.indexOf('Nómina') + 1,
      h + ' va después: es evidencia, no se toca');
  });
});

PRUEBAS.caso('⚠️ la hoja LÉEME dice cuáles se editan', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p094Env();
  GS.cargarGs(CTX.gs, env, ['documentarCH']).documentarCH();
  const lee = env.__libro.getSheetByName('LÉEME');
  PRUEBAS.cierto(!!lee, 'existe la hoja LÉEME');
  if (!lee) return;
  const txt = lee.__volcado().map(f => f.join(' | ')).join('\n');
  PRUEBAS.cierto(/Nómina.*SÍ/.test(txt), '⚠️ dice que Nómina SÍ se edita');
  PRUEBAS.cierto(/Bitácora.*NUNCA/.test(txt), 'y que la Bitácora NUNCA');
  PRUEBAS.cierto(/Credenciales.*NO COMPARTIR/i.test(txt), 'y que Credenciales no se comparte');
});

PRUEBAS.caso('correrla dos veces no duplica nada', () => {
  /* Se va a correr cada vez que se agregue una hoja o se cambie un texto. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p094Env();
  const api = GS.cargarGs(CTX.gs, env, ['documentarCH']);
  const r1 = api.documentarCH();
  const filas1 = env.__libro.getSheetByName('LÉEME').__volcado().length;
  const r2 = api.documentarCH();
  const filas2 = env.__libro.getSheetByName('LÉEME').__volcado().length;
  PRUEBAS.igual(filas2, filas1, '⚠️ el LÉEME no se duplica');
  PRUEBAS.igual(r2.puestas, r1.puestas, 'y se ponen las mismas notas');
  PRUEBAS.igual(r2.movidas, 0, 'y la segunda vez no mueve nada: ya estaba ordenado');
});

PRUEBAS.caso('⚠️ avisa si una columna documentada ya no existe', () => {
  /* Sin esto, renombrar una columna dejaría su explicación huérfana en silencio: la nota
     simplemente no se pondría y nadie se enteraría hasta que alguien la buscara. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Nómina': [["Empresa","Nombre y apellido","CEDULA_RENOMBRADA","Departamento"]],
  });
  const r = GS.cargarGs(CTX.gs, env, ['documentarCH']).documentarCH();
  PRUEBAS.cierto((r.sinColumna || []).some(x => /Cédula/.test(x)),
    '⚠️ el reporte tiene que nombrar la columna que no encontró');
});

PRUEBAS.caso('no se rompe si falta una hoja', () => {
  /* El CH de un cliente nuevo no tiene todas las hojas creadas todavía. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({ 'Nómina': [["Empresa","Nombre y apellido","Cédula"]] });
  const r = GS.cargarGs(CTX.gs, env, ['documentarCH']).documentarCH();
  PRUEBAS.alMenos((r.sinHoja || []).length, 1, 'las que faltan se listan');
  PRUEBAS.alMenos(r.puestas, 1, 'y las que están igual se documentan');
});
