
PRUEBAS.grupo('P102/P103 · la bitácora que no se podía ver, y la contraseña que dejaba afuera');

/* Dos defectos del endpoint, los dos con el mismo perfil: nadie los reportó nunca porque el
   síntoma no se distingue de otra cosa.
   · P102 — las altas y cambios de contraseña se escribían en la Bitácora con DIEZ columnas de
     trece, sin `IdEvento` ni `JSON`. Y `accionBitacora` lee EXCLUSIVAMENTE la del JSON, así que
     `JSON.parse("")` tiraba, el `catch` vacío se lo tragaba, y esas filas eran invisibles para
     todos los paneles. Se escribían para nada. Es R3 en su punto más caro: la bitácora es lo
     único que queda cuando la prevención falla, y el evento que faltaba es el que delata una
     cuenta tomada.
   · P103 — `Accesos` es la ÚNICA hoja del CH que nunca recibió `setNumberFormat("@")`. Una
     contraseña "007" se guarda como el número 7 y esa cuenta no entra más; desde afuera se ve
     igual que una clave mal escrita. */

function p102Env(filasBitacora, filasAccesos){
  return GS.crearEntorno({
    'Bitácora': [["Fecha","Empresa","Accion","Sujeto","Actor","Rol","Origen","NivelRiesgo",
                  "UmbralAmarillo","UmbralRojo","AppVersion","IdEvento","JSON"]].concat(filasBitacora || []),
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"]].concat(filasAccesos || []),
    'Sesiones': [["Id","HashToken","Usuario","Dispositivo","Rol","Vista","Empresas","Canonical",
                  "Combinada","Creada","UltimoUso","Estado","Cerrada"]],
  });
}

/* ══════════ P102 ══════════ */

PRUEBAS.caso('⚠️ EL CONTRATO: lo que el servidor escribe en la bitácora, el panel lo puede leer', () => {
  /* R17 — es EL caso. Los dos lados existían y funcionaban por separado: la escritura ponía una
     fila y la lectura devolvía eventos. Lo que nadie probó es que una fila escrita por el
     servidor sobreviviera a la lectura. No sobrevivía. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const env = p102Env([], [['Helitec','clave123','supervisor','Helitec','','']]);
  const api = GS.cargarGs(CTX.gs, env, ['bitacoraServidor', 'accionBitacora']);

  api.bitacoraServidor('Helitec', 'credencial_creada', 'V-12345678', { cedula: 'V-12345678' });
  const r = JSON.parse(api.accionBitacora({ usuario:'Helitec', pass:'clave123', empresa:'Helitec' }).getContent());

  PRUEBAS.cierto(r.ok, 'la lectura responde');
  PRUEBAS.igual((r.eventos || []).length, 1,
    '⚠️ el evento que el servidor escribió TIENE que aparecer — antes daba 0 y nadie se enteraba');
  const ev = (r.eventos || [])[0] || {};
  PRUEBAS.igual(ev.accion, 'credencial_creada', 'y con su acción');
  PRUEBAS.igual(ev.sujeto, 'V-12345678', 'y su sujeto');
  PRUEBAS.cierto(!!ev.id, 'y un id, que es lo que permite no duplicarlo');
});

PRUEBAS.caso('el DISCRIMINADOR: una fila corta SÍ se pierde', () => {
  /* Sin esto, el caso de arriba podría estar dando verde porque la lectura acepta cualquier cosa.
     Se escribe la fila EXACTA que escribía el código viejo —10 columnas, sin JSON— y se confirma
     que desaparece. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p102Env([['05/09/2026 10:00','Helitec','credencial_creada','V-1','V-1','sistema','endpoint','','','']],
                      [['Helitec','clave123','supervisor','Helitec','','']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionBitacora']);
  const r = JSON.parse(api.accionBitacora({ usuario:'Helitec', pass:'clave123', empresa:'Helitec' }).getContent());
  PRUEBAS.igual((r.eventos || []).length, 0,
    '⚠️ la fila vieja de 10 columnas se pierde — o sea que la prueba de arriba mide algo real');
});

PRUEBAS.caso('⚠️ el alta de una contraseña queda registrada y se puede ver', () => {
  /* El camino REAL: crear una credencial y después leer la bitácora, como haría alguien
     investigando una cuenta tomada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const fuente = CTX.gs.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const i = fuente.indexOf('credencial_creada');
  PRUEBAS.alMenos(i, 0, 'existe el registro del alta');
  if (i < 0) return;
  PRUEBAS.cierto(/bitacoraServidor\(/.test(fuente.slice(Math.max(0, i - 200), i + 200)),
    '⚠️ el alta usa bitacoraServidor(), que escribe las 13 columnas');
  PRUEBAS.falso(/shb\.appendRow/.test(fuente),
    'y ya no queda ningún appendRow corto a la bitácora');
});

/* ══════════ P103 ══════════ */

PRUEBAS.caso('⚠️ una contraseña "007" guardada como número 7 SIGUE ENTRANDO', () => {
  /* Es el defecto exacto: Sheets convierte "007" en 7, y la comparación de strings falla. La
     cuenta queda afuera y el síntoma no se distingue de una clave mal escrita. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p102Env([], [['Helitec', 7, 'supervisor', 'Helitec', '', '']]);   // ← número, como lo dejó Sheets
  const api = GS.cargarGs(CTX.gs, env, ['validarAcceso']);
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', '007', 'disp1'),
    '⚠️ con la celda en 7 y el usuario escribiendo 007, tiene que entrar');
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', '7', 'disp1'), 'y escribiendo 7 también');
});

PRUEBAS.caso('pero una contraseña incorrecta sigue siendo incorrecta', () => {
  /* La relajación es SÓLO para los ceros a la izquierda de una clave numérica. Si esto pasara
     cualquier cosa, el arreglo sería peor que el defecto. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p102Env([], [['Helitec', 7, 'supervisor', 'Helitec', '', '']]);
  const api = GS.cargarGs(CTX.gs, env, ['validarAcceso']);
  ['70', '007a', '', '8', 'siete'].forEach(mala =>
    PRUEBAS.falso(!!api.validarAcceso('Helitec', mala, 'd'), 'no entra con «' + mala + '»'));
});

PRUEBAS.caso('y una contraseña con letras se compara TAL CUAL', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p102Env([], [['Helitec', 'Abc007', 'supervisor', 'Helitec', '', '']]);
  const api = GS.cargarGs(CTX.gs, env, ['validarAcceso']);
  PRUEBAS.cierto(!!api.validarAcceso('Helitec', 'Abc007', 'd'), 'entra la exacta');
  PRUEBAS.falso(!!api.validarAcceso('Helitec', 'Abc7', 'd'), '⚠️ y NO se le quitan ceros a una con letras');
});

PRUEBAS.caso('las tres contraseñas de la fila se comparan igual', () => {
  /* Supervisor (col B), médica (col E) y HSEQ (col F). El defecto estaba en las tres. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = p102Env([], [['Helitec', 1, 'supervisor', 'Helitec', 2, 3]]);
  const api = GS.cargarGs(CTX.gs, env, ['validarAcceso']);
  const sup = api.validarAcceso('Helitec', '001', 'd');
  const med = api.validarAcceso('Helitec', '002', 'd');
  const hseq = api.validarAcceso('Helitec', '003', 'd');
  PRUEBAS.cierto(!!sup, 'supervisor');
  PRUEBAS.igual(med && med.vista, 'medico', 'servicio médico');
  PRUEBAS.igual(hseq && hseq.vista, 'hseq', 'dirección');
});
