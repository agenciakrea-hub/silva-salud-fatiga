PRUEBAS.grupo('P158 · el código resuelve los encabezados REALES del CH');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   P157 destapó algo que ninguna prueba estaba mirando: **la suite usa seis formas distintas del
   encabezado de `Accesos`** —`Clave`, `Pass`, `PassMed`, `ClaveMedica`, `ClaveHseq`,
   `Contraseña Médica`— y sólo una coincide con el CH, que dice «Contraseña (puede ser la que
   quieras)» y «Contraseña HSQ», sin la E. Cuarenta y seis casos se pusieron rojos hasta que el
   matcheo aceptó los sinónimos.

   Es el defecto que P118 ya había documentado para `Registrados Fatiga`: **una prueba que mide
   contra títulos que no existen no dice nada del CH**. Volvió a aparecer en otra hoja.

   ⚠️ LA PREGUNTA CORRECTA NO ES «¿las suites usan los títulos exactos?». Reescribir los ~98
   archivos que definen entornos sería mucho riesgo por poco: sus títulos abreviados son válidos
   como variantes, y el código debe tolerarlas porque la hoja la edita gente. La pregunta que
   importa es **«¿el código resuelve los títulos que el CH tiene HOY?»**, y eso se contesta con un
   caso por hoja contra los encabezados reales congelados en `pruebas/encabezados-ch.json`.

   ⚠️ ESE JSON SE LEYÓ DEL CH EN PRODUCCIÓN el 2026-09-09, con `tarea=encabezados`. Si alguien
   renombra una columna allá, este archivo deja de reflejarlo y hay que volver a bajarlo — y es
   justamente entonces cuando estos casos tienen que avisar.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

var P158_CH = null;
function p158Encabezados(){
  if (P158_CH) return Promise.resolve(P158_CH);
  return fetch('/pruebas/encabezados-ch.json', { cache:'no-store' })
    .then(r => r.json()).then(j => (P158_CH = j));
}
function p158Env(fns, hojas){
  const env = GS.crearEntorno(hojas);
  return GS.cargarGs(CTX.gs, env, fns);
}

PRUEBAS.caso('🔴 `Accesos`: el código resuelve las seis columnas con los títulos REALES', async () => {
  /* Los del CH son frases largas: «Usuario (puede ser el que quieras)», «Contraseña Médica (si no
     se pone ninguna…)». Y la de Dirección dice «Contraseña HSQ». Si el matcheo dejara de
     reconocerlas, `validarAcceso` falla cerrado y NADIE entra a ningún panel. */
  const ch = await p158Encabezados();
  const cab = ch['Accesos'];
  PRUEBAS.alMenos(cab.length, 6, 'guarda de medibilidad: el JSON trae las seis columnas del CH');
  const api = p158Env(['accCols','accColsOk'], { 'Accesos': [cab.slice()] });
  const c = api.accCols(cab);
  PRUEBAS.igual(api.accColsOk(c), true,
    '⚠️ resuelve las tres imprescindibles · si no, `validarAcceso` falla cerrado y no entra nadie');
  PRUEBAS.igual(c.usuario, 0, 'Usuario en su columna');
  PRUEBAS.igual(c.pass, 1, 'la contraseña de supervisor en la suya');
  PRUEBAS.igual(c.empresas, 3, 'EMPRESAS en la suya');
  PRUEBAS.cierto(c.passMed > 0, 'la médica se reconoce · «Contraseña Médica (si no se pone…)»');
  PRUEBAS.cierto(c.passHseq > 0, 'y la de Dirección · dice «Contraseña HSQ», sin la E');
  PRUEBAS.cierto(c.passMed !== c.pass && c.passHseq !== c.passMed,
    '🔒 y las tres son columnas DISTINTAS · confundirlas convierte a un supervisor en médico');
});

PRUEBAS.caso('🔴 `Registrados Fatiga`: los 24 campos encuentran su columna real', async () => {
  /* El mapa de P147/P156. La columna A del CH no tiene título —lleva un texto de descripción— así
     que la fecha de registro se resuelve por posición histórica; todo lo demás, por encabezado. */
  const ch = await p158Encabezados();
  const cab = ch['Registrados Fatiga'];
  const api = p158Env(['regResolverColumnas_'],
                      { 'Registrados Fatiga': [cab.slice()] });
  const norm = s => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const r = api.regResolverColumnas_(cab.map(norm));
  PRUEBAS.igual((r.sinColumna || []).join(', '), '',
    '⚠️ ningún campo se queda sin columna · el que se quede deja de escribirse, en silencio');
  PRUEBAS.igual(r.mapa.cedula, cab.indexOf('Cedula') >= 0 ? cab.indexOf('Cedula') : r.mapa.cedula,
    'la cédula, que es con la que se deduplica');
  PRUEBAS.cierto(r.mapa.esPiloto !== r.mapa.id_piloto,
    '🔒 «Es piloto» y «Id Piloto» son columnas distintas · confundirlas apagó la marca en P136');
});

PRUEBAS.caso('⚠️ `Confiabilidad`: la columna Empresa es la 5, que es lo que P155 acota', async () => {
  /* `upsertPorId(sh, 2, id, fila, 5, empresa)` usa ese 5. Si la hoja cambia, el upsert deja de
     acotar y vuelve a pisar la fila del homónimo. */
  const ch = await p158Encabezados();
  const cab = ch['Confiabilidad'];
  PRUEBAS.igual(String(cab[1]), 'IdRegistro', 'la columna 2 sigue siendo el id · el upsert busca ahí');
  PRUEBAS.igual(String(cab[4]), 'Empresa', '⚠️ la columna 5 sigue siendo Empresa · P155 acota por ahí');
});

PRUEBAS.caso('⚠️ `Casos Odoo`: teléfono y correo siguen en F y G', async () => {
  /* `upsertCasoOdoo` arma la fila por posición. Es la hoja que Odoo lee para llamar a la persona. */
  const ch = await p158Encabezados();
  const cab = ch['Casos Odoo'];
  PRUEBAS.igual(String(cab[5]), 'Telefono', 'Teléfono en F');
  PRUEBAS.igual(String(cab[6]), 'Correo', 'y Correo en G');
});

PRUEBAS.caso('🔒 el DISCRIMINADOR: con un encabezado renombrado, el código lo NOTA', async () => {
  /* Sin esto, los casos de arriba podrían estar pasando porque el resolutor acepta cualquier cosa.
     Se le cambia el título a la columna de EMPRESAS y tiene que fallar cerrado. */
  const ch = await p158Encabezados();
  const cab = ch['Accesos'].slice();
  cab[3] = 'Clientes que ve';          // ya no dice «EMPRESAS»
  const api = p158Env(['accCols','accColsOk'], { 'Accesos': [cab] });
  PRUEBAS.igual(api.accColsOk(api.accCols(cab)), false,
    '🔒 no resuelve · y por eso `validarAcceso` devuelve null en vez de tratarla como vacía');
});
