PRUEBAS.grupo('L11 · la ventana de alta: preparada, probada y APAGADA');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Cierra lo que vio el dueño del producto: sin ninguna credencial se podían listar las empresas
   clientes y, con el nombre de una, pedir su perfil.

   NACE APAGADA A PROPÓSITO. El semáforo de versiones (L10) dice 🔴: la app 6.00 —la que tiene el
   campo del código y la que reporta su versión— recién salió, y de las 7 personas de HELITEC no hay
   dato de ninguna. Encenderla hoy las dejaría afuera. Se enciende con un `config_set` remoto el día
   que el semáforo esté en verde, y se apaga igual: un comando, reversible.

   ── LAS TRES FORMAS DE ROMPER LA APP CERRANDO ESTO MAL ───────────────────────────────────────
   Las encontró la revisión adversarial y las tres están tapadas:
   1 · `empresa_perfil` con `ok:false` rompería `sectorRefrescar()`, que corre en CADA arranque de
       quien YA está registrado. Devuelve un perfil GENÉRICO con `ok:true`.
   2 · `listas` con `{ok:true, empresas:[]}` pasa la guarda `if (d && d.ok)` del cliente y le BORRA
       el caché de empresas al teléfono. Devuelve `ok:false`.
   3 · Cerrar `registro` pierde un alta EN SILENCIO —la persona ve «Listo» y no quedó nada—, así
       que NO se toca.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function l11Env(config){
  return GS.crearEntorno({
    'Config Empresa': [["Empresa","Clave","Valor"]].concat(config || []),
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"],
               ['Helitec','Ana Suárez','V-1','Op','Piloto','F',35,'+58','a@e.com','Sí','','empleado','2']],
  });
}

PRUEBAS.caso('🔴 APAGADA por defecto · sin la clave nada cambia', () => {
  /* Un cierre que se activa solo por un despliegue es la forma de dejar gente afuera sin decidirlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, l11Env(), ['altaEstaAbierta', 'accionNominaEmpresas', 'accionEmpresaPerfil']);
  PRUEBAS.cierto(api.altaEstaAbierta('Helitec'), '⚠️ sin la clave cargada, ABIERTA');
  const emp = JSON.parse(api.accionNominaEmpresas({}).getContent());
  PRUEBAS.cierto(emp.ok, 'guarda de medibilidad: la lista responde como hoy');
  PRUEBAS.alMenos((emp.empresas || []).length, 1, 'y trae la empresa · nada cambió');
});

PRUEBAS.caso('🔴 con la ventana CERRADA no se puede enumerar el padrón de clientes', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l11Env([['Helitec', 'altaAbierta', '0']]),
                          ['altaEstaAbierta', 'accionNominaEmpresas']);
  PRUEBAS.falso(api.altaEstaAbierta('Helitec'), 'guarda: la llave se leyó');
  const r = JSON.parse(api.accionNominaEmpresas({}).getContent());
  PRUEBAS.falso(!!r.ok, '⚠️ la lista de empresas deja de darse');
  PRUEBAS.igual(r.motivo, 'alta_cerrada', 'y dice por qué, para que el cliente pueda ramificar');
  PRUEBAS.falso(/Helitec/.test(JSON.stringify(r)),
    '⚠️ y ningún nombre de empresa se cuela, ni siquiera en el mensaje de error');
});

PRUEBAS.caso('🔴 `listas` responde ok:false · NUNCA una lista vacía con ok:true', () => {
  /* Es la diferencia entre cerrar una puerta y borrarle los datos al teléfono de la persona. Con
     `{ok:true, empresas:[]}` la guarda `if (d && d.ok)` del cliente pasa y pisa el caché. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const bloque = (gs.match(/if \(accion === "listas" && algunaAltaCerrada\(\)\)[\s\S]{0,320}/) || [''])[0];
  PRUEBAS.alMenos(bloque.length, 60, 'guarda de medibilidad: se encontró el corte');
  PRUEBAS.cierto(/ok:false/.test(bloque), '⚠️ responde ok:false');
  PRUEBAS.falso(/ok:true[\s\S]{0,40}empresas: \[\]/.test(bloque),
    '⚠️ y NO una lista vacía con ok:true · eso le borraría el caché al teléfono');
});

PRUEBAS.caso('🔴 `empresa_perfil` cerrado devuelve un perfil GENÉRICO, no un error', () => {
  /* Dos motivos a la vez: (1) un error confirma que la empresa NO existe y un perfil confirma que
     SÍ — la fuga es esa diferencia, y un perfil idéntico para cualquier nombre no dice nada;
     (2) `sectorRefrescar()` llama a esto en cada arranque de quien ya está registrado, y un
     `ok:false` le rompería el sector. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, l11Env([['Helitec', 'altaAbierta', '0']]), ['accionEmpresaPerfil']);
  const real = JSON.parse(api.accionEmpresaPerfil({ empresa: 'Helitec' }).getContent());
  PRUEBAS.cierto(real.ok, '⚠️ sigue respondiendo ok:true · si no, se rompe cada arranque');
  PRUEBAS.igual(real.perfil.nombre, '', '⚠️ pero sin el nombre de la empresa');
  PRUEBAS.cierto(real.perfil.pideCodigo,
    'y con `pideCodigo:true`, que es lo único que el cliente necesita para mostrar el campo');

  /* Y el DISCRIMINADOR de la fuga: una empresa inventada tiene que responder IGUAL. Si respondiera
     distinto, seguiría sirviendo para adivinar clientes, que es todo el defecto. */
  const falsa = JSON.parse(api.accionEmpresaPerfil({ empresa: 'Empresa Que No Existe SA' }).getContent());
  PRUEBAS.igual(JSON.stringify(falsa.perfil), JSON.stringify(real.perfil),
    '⚠️ una empresa REAL y una INVENTADA responden idéntico · no se puede adivinar cuál existe');
});

PRUEBAS.caso('⚠️ `registro` NO se cierra · un alta perdida en silencio es peor que la fuga', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function accionRegistro[\s\S]{0,400}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 100, 'guarda: se encontró la acción');
  PRUEBAS.falso(/altaEstaAbierta|algunaAltaCerrada/.test(fn),
    '⚠️ no lleva la ventana · la persona vería «Listo» y no quedaría nada. Se cierra el día que se ' +
    'publique un cliente que sepa mostrar el rechazo');
});

PRUEBAS.caso('🔴 a la persona se le avisa si alguien le crea la contraseña', () => {
  /* Crear una contraseña es tomar una cuenta. Hasta acá la persona se enteraba el día que intentaba
     entrar y no podía. La revisión adversarial pidió esto ANTES de cualquier cierre. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function credAvisarDueno[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 200, 'guarda de medibilidad: existe la función');
  PRUEBAS.cierto(/leerNomina\(\)/.test(fn),
    '⚠️ el correo sale de la NÓMINA · si viniera del POST, el atacante elegiría a dónde avisar');
  PRUEBAS.falso(/p\.email|p\.correo/.test(fn), 'y nunca de lo que mande el cliente');
  PRUEBAS.cierto(/catch \(e\) \{\}/.test(fn),
    '⚠️ y va en try/catch: una cuota de correo agotada no puede impedir crear una contraseña');
  /* Que esté CONECTADO, no sólo escrito. */
  const crear = (gs.match(/function accionCredencialCrear[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.cierto(/credAvisarDueno\(/.test(crear), '⚠️ y la creación lo llama de verdad');
});
