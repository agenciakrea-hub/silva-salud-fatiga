PRUEBAS.grupo('Auditoría del login · nueve defectos, y ninguno lo veía la suite');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   La suite daba 1106/1106 con el flujo nuevo ROTO. El auditor lo dijo con precisión: NINGÚN caso
   ejercitaba `codigo_empresa`, `nominaSoyYo`, `nominaCedulaBuscar` ni el `nomina_confirmar` sin
   nombre. Un verde sobre código que nadie ejecuta no es una garantía, es un adorno.
   Este archivo existe para que cada uno de esos defectos tenga quien lo vea.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function lAudEnv(nomina, config){
  return GS.crearEntorno({
    'Config Empresa': [["Empresa","Clave","Valor"]].concat(config || []),
    /* ⚠️ EL ALIAS ES EL ESCENARIO. La columna «Empresas» de `Accesos` es de donde
       `construirAlias()` saca que «Helitec» y «Consorcio HELITEC» son la misma empresa. Sin las
       dos formas acá, la prueba del alias no mide nada — se me pasó la primera vez y el caso falló
       por el entorno, no por el código. */
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"],
                ['Consorcio HELITEC','sup001','supervisor','Consorcio HELITEC, Helitec','med002','dir003']],
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
               .concat(nomina || []),
  });
}
const L_SIETE = ['Ana','Bruno','Carla','Diego','Elena','Fabio','Gaby'].map((n, i) =>
  ['Consorcio HELITEC', n + ' Apellido', 'V-' + (i + 1), 'Op', 'Piloto', 'F', 30,
   '+58', n.toLowerCase() + '@e.com', 'Sí', '', 'empleado', '2']);

PRUEBAS.caso('🔴 el alta funciona para TODAS las personas, no sólo la primera', () => {
  /* EL DEFECTO: `nomina_confirmar` sin nombre se rendía en la PRIMERA fila de la empresa —
     `return` en vez de `continue`—, así que entraba una y fallaban seis. Y cada intento honesto
     sumaba al freno hasta dejar a la persona diez minutos afuera, mientras la app le decía que
     revisara un número que estaba bien.
     Estaba latente sólo porque el código de empresa está vacío: se disparaba el día que se cargue,
     que es el objetivo del bloque. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE), ['accionNominaConfirmar']);
  const entran = [];
  L_SIETE.forEach((f, i) => {
    const r = JSON.parse(api.accionNominaConfirmar({
      empresa: 'Consorcio HELITEC', cedula: 'V-' + (i + 1),
      dispositivoId: 'disp' + i        // uno por persona: el freno es por dispositivo
    }).getContent());
    if (r.ok && r.perfil) entran.push(r.perfil.nombre);
  });
  PRUEBAS.igual(entran.length, 7,
    '⚠️ las SIETE entran con su cédula · antes entraba 1 y fallaban 6 · entraron: ' + entran.join(', '));
  PRUEBAS.igual(entran[6], 'Gaby Apellido', 'y la última de la lista también, no sólo la primera');
});

PRUEBAS.caso('el DISCRIMINADOR: una cédula que NO está sigue fallando', () => {
  /* Sin esto, el caso de arriba daría verde si la acción aceptara cualquier cosa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE), ['accionNominaConfirmar']);
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa: 'Consorcio HELITEC', cedula: 'V-99999', dispositivoId: 'otro' }).getContent());
  PRUEBAS.falso(!!r.ok, '⚠️ una cédula inventada no entra');
});

PRUEBAS.caso('🔴 el «sólo POST» no se saltea con un parámetro en la URL', () => {
  /* `_post` era un campo más del objeto de parámetros: `?_post=1` en la query saltaba la guarda
     entera. Una guarda que el cliente puede escribir no es una guarda. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const dg = (gs.match(/function doGet\(e\)[\s\S]{0,500}/) || [''])[0];
  PRUEBAS.alMenos(dg.length, 60, 'guarda de medibilidad: se encontró doGet');
  PRUEBAS.cierto(/delete _q\._post/.test(dg),
    '⚠️ `doGet` borra `_post` de lo que llega en la query');
  const dp = (gs.match(/function doPost\(e\)[\s\S]{0,700}/) || [''])[0];
  const iFusion = dp.indexOf('body[k2]'), iPost = dp.indexOf('p._post = true');
  PRUEBAS.cierto(iFusion >= 0 && iPost > iFusion,
    '⚠️ y `doPost` lo asigna DESPUÉS de fusionar · si no, el cliente lo pisaría');
});

PRUEBAS.caso('🔴 con el alta cerrada, un código válido no se distingue por el contador', () => {
  /* El JSON era idéntico pero el ESTADO no: un código correcto con la ventana cerrada no anotaba
     fallo, así que mandándolo siete veces se sabía si era válido —si al séptimo salía
     `codigo_frenado` era falso; si seguía `codigo_invalido`, era VÁLIDO—. Siete POST. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function accionCodigoEmpresa[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 300, 'guarda: se encontró la acción');
  const ramas = (fn.match(/codAnotarFallo/g) || []).length;
  PRUEBAS.alMenos(ramas, 3,
    '⚠️ todas las ramas de rechazo anotan el fallo · ' + ramas + ' encontradas (inválido, ambiguo, cerrado)');
});

PRUEBAS.caso('🔴 el freno del código lee el contador POR EMPRESA, no sólo el del dispositivo', () => {
  /* `codClaveEmpresa` se ESCRIBÍA y no se leía nunca. Como el `dispositivoId` lo manda el cliente,
     rotarlo daba intentos ilimitados: 200 códigos con 200 dispositivos, cero frenados. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE), ['codFrenado', 'codAnotarFallo']);
  PRUEBAS.falso(api.codFrenado('E', 'disp1'), 'guarda: se arranca sin freno');
  /* Se queman intentos ROTANDO el dispositivo, que es lo que hacía inútil al freno viejo. */
  for (let i = 0; i < 70; i++) api.codAnotarFallo('E', 'disp' + i);
  PRUEBAS.cierto(api.codFrenado('E', 'dispCompletamenteNuevo'),
    '⚠️ tras muchos fallos contra la MISMA empresa, un dispositivo nuevo también queda frenado');
  PRUEBAS.falso(api.codFrenado('OtraEmpresa', 'dispCompletamenteNuevo'),
    'y el freno es POR EMPRESA · otra empresa no se ve afectada');
});

PRUEBAS.caso('🔴 un código cargado bajo un alias NO deja la empresa abierta', () => {
  /* `valorConfigPropio` compara el texto de la celda tal cual: un código en la fila «Helitec» no
     se encontraba al preguntar por «Consorcio HELITEC». El código existía, el alta nueva lo
     honraba, y al mismo tiempo `pideCodigo` daba false y la nómina se entregaba SIN código. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE, [['Helitec', 'codigoRegistro', 'HELI-2026']]),
                          ['verificarCodigoEmpresa', 'perfilPublicoEmpresa', 'codigoRegistroDe']);
  PRUEBAS.igual(api.codigoRegistroDe('Consorcio HELITEC'), 'HELI-2026',
    '⚠️ se encuentra el código aunque la fila diga otra forma del nombre');
  const chk = api.verificarCodigoEmpresa('Consorcio HELITEC', 'HELI-2026');
  PRUEBAS.cierto(chk.pide, '⚠️ y la empresa SÍ pide código · antes decía que no y quedaba abierta');
  PRUEBAS.cierto(chk.ok, 'y el código correcto entra');
  PRUEBAS.cierto(api.perfilPublicoEmpresa('Consorcio HELITEC').pideCodigo,
    '⚠️ y el perfil público lo dice, que es lo que hace que la app muestre el campo');
});

PRUEBAS.caso('⚠️ guardar el perfil no borra el rol que la nómina propuso', () => {
  /* `saveProfile` era el ÚNICO `setProfile` del archivo sin merge: un literal cerrado de 13 campos
     que reemplazaba el perfil entero. Corre tres segundos después de que el alta guarda `rol`, así
     que la pantalla del ofrecimiento no se abría NUNCA. */
  CTX.resetear();
  setProfile(Object.assign({}, getProfile() || {}, { rol: 'supervisor', rolOrigen: 'nomina' }));
  PRUEBAS.igual((getProfile() || {}).rol, 'supervisor', 'guarda de medibilidad: el rol quedó puesto');
  const src = String(saveProfile);
  PRUEBAS.cierto(/Object\.assign\(\{\}, getProfile\(\) \|\| \{\}/.test(src),
    '⚠️ `saveProfile` mergea sobre el perfil previo · era el único que no lo hacía');
  PRUEBAS.falso(/const perfil = \{ nombre, cedula, id_piloto/.test(src),
    'y ya no arma un literal cerrado que pise todo lo demás');
});

PRUEBAS.caso('⚠️ un «Volver» no devuelve la lista de nombres de la nómina', () => {
  /* Cuatro toques —código, Continuar, Volver, Continuar— y la persona caía en «Búscate en la
     lista» con el padrón completo a la vista, porque el origen se INFERÍA de que `NOM.empresa`
     tuviera valor y `nominaResolverCodigo` también la setea. Y esa sesión ya no volvía nunca al
     flujo nuevo. */
  const src = String(nominaCodigoConfirmar);
  PRUEBAS.cierto(/NOM\.empresaPorLista/.test(src),
    '⚠️ el origen se marca con un flag, no se adivina de que la empresa tenga valor');
  PRUEBAS.falso(/if \(NOM\.empresa\) \{ nominaCargarPersonas/.test(src),
    '⚠️ y ya no se infiere · esa premisa era falsa porque resolver el código también la setea');
  PRUEBAS.cierto(/empresaPorLista = true/.test(String(nominaElegirEmpresa)),
    'se pone SÓLO al elegir de la lista');
  PRUEBAS.cierto(/empresaPorLista = false/.test(String(nominaResolverCodigo)),
    'y se limpia al resolver por código');
});
