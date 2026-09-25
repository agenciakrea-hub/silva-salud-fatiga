PRUEBAS.grupo('Nómina · la hoja de la empresa muestra lo que cada persona cargó, sin congelarle el perfil');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO PIDIÓ FRANCO MIRANDO EL LINK DE LA HOJA (2026-09-25): «no veo los datos actualizados que los
   empleados pusieron». Medido ese día en tres fuentes que coinciden —la `Nómina` del CH,
   `Registrados Fatiga` y la hoja real bajada en CSV—: **14 de 20 filas con huecos, 50 celdas**.
   La causa era de dirección: el sync iba sólo de la hoja al CH y NUNCA escribía en la hoja.

   ⚠️ EL ARREGLO OBVIO —llenar las celdas vacías— SE ESCRIBIÓ, PASÓ LA SUITE EN VERDE Y SE
   REVIRTIÓ, porque rompía justo lo que venía a arreglar. La `Nómina` es el TECHO de
   `perfilDePersona`: pisa el perfil DONDE TIENE DATO. Con la celda vacía gana la persona; llenarla
   le congela el teléfono para siempre — lo cambia en la app, el login siguiente se lo revierte al
   viejo, y `sincronizarRegistro` reescribe el viejo en `Registrados Fatiga`. La edición desaparece
   de las dos hojas y ella no tiene forma de arreglarla.
   La lección ya estaba escrita en este repo y se repitió: **la ausencia de valor ES un valor**. La
   celda vacía de la nómina significa «RRHH no opinó»; escribirla significa «RRHH decidió». P180
   encontró exactamente esto en las columnas de rol.

   Por eso el arreglo son DOS MITADES que no se pueden separar:
   · `perfilDePersona` · sexo, edad, teléfono y correo dejan de ser TECHO y pasan a RESPALDO;
   · el sync · esos cuatro se reflejan en la hoja desde el alta, siempre; departamento y cargo
     siguen siendo de la empresa y sólo se llenan si están vacíos.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const NRA_TOKEN = () => (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
const NRA_CAB_NOM = ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
  'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo','Estado',
  '¿Supervisor?','¿Servicio médico?','¿Dirección?'];
const NRA_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];

/* Una fila de `Registrados Fatiga` como la escribe `accionRegistro`: por encabezado.
   ⚠️ «Es piloto» va SIEMPRE con valor —«Sí» o «No»—, nunca vacía: así la escribe `regValorDe_`
   con `bool:true`, y es la razón por la que esa columna no se refleja (ver el caso de abajo). */
function nraAlta(o){
  const f = new Array(NRA_CAB_REG.length).fill('');
  const set = (c, v) => { const j = NRA_CAB_REG.indexOf(c); if (j >= 0) f[j] = v; };
  set('Fecha y hora','2026-09-24 10:00:00'); set('Nombre', o.nombre); set('Cédula', o.cedula);
  set('Empresa', o.empresa || 'Aeroambulancias Silva'); set('Email', o.email || '');
  set('Departamento', o.departamento || ''); set('Cargo', o.cargo || '');
  set('Sexo', o.sexo || ''); set('Edad', o.edad || ''); set('Teléfono', o.telefono || '');
  set('Es piloto', o.esPiloto === undefined ? 'No' : o.esPiloto); set('ID Piloto', o.idPiloto || '');
  return f;
}
function nraEnv(altas, fns){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['silva','claveS','supervisor','Aeroambulancias Silva, Silva','','']],
    'Nómina': [NRA_CAB_NOM.slice()],
    'Registrados Fatiga': [NRA_CAB_REG.slice()].concat(altas || []),
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Consentimientos': [['Fecha','IdConsentimiento','Persona','Empresa','Cedula','Versiones','AppVersion']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['manejar','leerNomina','valorConfigPropio','nominaSincronizarTodas',
    'perfilDePersona','perfilFilaRegistrados','perfilFilaNomina','cedulaNorm'].concat(fns || []));
  api.__env = env;
  api.__mant = (t, x) => JSON.parse(api.manejar(Object.assign(
    { action:'mantenimiento', token:NRA_TOKEN(), tarea:t, _post:true }, x || {})).getContent());
  api.__crearHoja = () => api.__mant('nomina_hoja_crear', { empresa:'Aeroambulancias Silva', confirmar:'1' });
  api.__hoja = () => { const id = api.valorConfigPropio('Aeroambulancias Silva','nominaHojaId');
    return env.__libros[id].getSheetByName('Nómina'); };
  /* Como la carga RRHH: por encabezado, así el caso no se rompe si la hoja se reordena. */
  api.__ponerFila = (v) => { const sh = api.__hoja();
    const cab = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x => String(x||''));
    const f = new Array(cab.length).fill('');
    Object.keys(v).forEach(k => { const j = cab.indexOf(k); if (j >= 0) f[j] = v[k]; });
    sh.appendRow(f); };
  const leer = (vol, nombre) => { const cab = vol[0].map(x => String(x||''));
    const fila = vol.slice(1).filter(f => String(f[cab.indexOf('Nombre y apellido')]||'') === nombre)[0];
    if (!fila) return null;
    const o = {}; cab.forEach((c,j) => { if (c) o[c] = String(fila[j] == null ? '' : fila[j]); }); return o; };
  api.__enHoja = (n) => leer(api.__hoja().__volcado(), n);
  /* ⚠️ EL EMULADOR NO MUEVE `getLastUpdated` AL ESCRIBIR CELDAS —sólo con `__tocar()`— y en
     producción sí se mueve. Sin esto, la segunda corrida de cualquier caso se saltea por el atajo
     de P173 y las comprobaciones pasan porque NO SE EJECUTÓ NADA. Es exactamente cómo el
     discriminador de abajo estaba pasando por la razón equivocada: lo encontró el verificador. */
  api.__tocarHoja = () => { const id = api.valorConfigPropio('Aeroambulancias Silva','nominaHojaId');
    api.__env.__libros[id].__tocar(); };
  api.__enCh   = (n) => leer(env.__libro.getSheetByName('Nómina').__volcado(), n);
  return api;
}
const nraSin = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return true; } return false; };

PRUEBAS.caso('🔴 la hoja de la empresa queda con lo que la persona cargó, y el CH lo ve en la MISMA corrida', () => {
  if (nraSin()) return;
  const api = nraEnv([ nraAlta({ nombre:'Alexander Medina', cedula:'6318692', departamento:'Almacén',
    cargo:'Coordinador', sexo:'Masculino', edad:'58', telefono:'+58412-1112233', email:'ale@aero.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Alexander Medina', 'Cédula':'6318692',
                    'Departamento':'Almacén', 'Cargo':'Coordinador', 'Rol en la app':'Empleado' });
  const antes = api.__enHoja('Alexander Medina');
  PRUEBAS.igual([antes['Sexo'], antes['Edad'], antes['Teléfono'], antes['Email']], ['','','',''],
    'guarda: las cuatro arrancan vacías · si no, el caso no probaría nada');

  api.nominaSincronizarTodas(true);

  const h = api.__enHoja('Alexander Medina');
  PRUEBAS.igual([h['Sexo'], h['Edad'], h['Email']], ['Masculino','58','ale@aero.com'], '🔴 la hoja ya los muestra');
  PRUEBAS.igual(h['Teléfono'], '+58412-1112233',
    '🔴 y el teléfono con el «+» intacto · R15: sin formato texto Sheets lo vuelve fórmula');
  const c = api.__enCh('Alexander Medina');
  PRUEBAS.igual([c['Sexo'], c['Edad'], c['Email']], ['Masculino','58','ale@aero.com'],
    '🔴 y el CH en la MISMA corrida · reflejar DESPUÉS de copiar dejaría el panel con la nómina a medias cinco minutos');
});

PRUEBAS.caso('🔴 EL CIRCUITO COMPLETO · la persona cambia su teléfono y el perfil NO se lo revierte', () => {
  if (nraSin()) return;
  /* Éste es el caso que hizo revertir la primera versión. Con la nómina como TECHO, el paso 4
     devolvía el teléfono viejo y `sincronizarRegistro` lo reescribía en `Registrados Fatiga`. */
  const api = nraEnv([ nraAlta({ nombre:'Alexander Medina', cedula:'6318692', departamento:'Almacén',
    cargo:'Coordinador', sexo:'Masculino', edad:'58', telefono:'0412-1112233', email:'ale@aero.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Alexander Medina', 'Cédula':'6318692', 'Departamento':'Almacén' });
  api.nominaSincronizarTodas(true);
  PRUEBAS.igual(api.__enHoja('Alexander Medina')['Teléfono'], '0412-1112233', 'guarda: la nómina quedó con el teléfono del alta');

  /* ⚠️ LA EDICIÓN ENTRA POR EL CAMINO REAL (R17): `action:'registro'`, que es lo que manda
     `sincronizarRegistro` desde «Editar mis datos». Escribir la celda a mano probaría el lector y
     no que el escritor le da lo que pide — y de hecho esa versión del caso SE SALTEABA el sello
     que hace que el sync se entere, que es justo la mitad del arreglo que faltaba. */
  const rEdit = JSON.parse(api.manejar({ action:'registro', _post:true, dispositivoId:'d1',
    nombre:'Alexander Medina', cedula:'6318692', empresa:'Aeroambulancias Silva',
    email:'ale@aero.com', departamento:'Almacén', cargo:'Coordinador',
    sexo:'Masculino', edad:'58', telefono:'0424-9998877' }).getContent());
  PRUEBAS.cierto(rEdit.ok, 'guarda: el registro se aceptó · ' + JSON.stringify(rEdit).slice(0, 90));

  /* ⚠️ Las dos capas por separado ANTES del veredicto: si esto se cae, el reporte dice en cuál de
     las dos está el problema en vez de dejar un «esperaba X, obtuvo Y» sin causa. */
  const piso  = api.perfilFilaRegistrados('Aeroambulancias Silva', api.cedulaNorm('6318692'));
  const techo = api.perfilFilaNomina('Aeroambulancias Silva', api.cedulaNorm('6318692'));
  PRUEBAS.igual(piso && piso.telefono, '0424-9998877', 'guarda: el PISO (Registrados) tiene el nuevo');
  PRUEBAS.igual(techo && techo.telefono, '0412-1112233', 'guarda: el TECHO (Nómina) todavía tiene el viejo · es la situación que se quiere probar');

  const p = api.perfilDePersona('Aeroambulancias Silva', api.cedulaNorm('6318692'));
  PRUEBAS.igual(p.telefono, '0424-9998877',
    '🔴 el perfil devuelve el teléfono NUEVO · con la nómina como techo devolvía el viejo, el cliente lo mergeaba y el backfill lo reescribía: la edición desaparecía de las dos hojas');

  /* Y la corrida siguiente lo refleja en la hoja: si no, Franco seguiría viendo el viejo. */
  api.nominaSincronizarTodas(true);
  PRUEBAS.igual(api.__enHoja('Alexander Medina')['Teléfono'], '0424-9998877',
    '🔴 y la hoja se pone al día sola · «ver los datos actualizados» es el pedido entero, no sólo los vacíos');
});

PRUEBAS.caso('🔴 lo que la EMPRESA declara no se toca: departamento y cargo son suyos', () => {
  if (nraSin()) return;
  /* El caso vivo: Oliver Pereira escribió «Operaciónes» con tilde en su alta y la hoja dice
     «Operaciones». Pisarlo partiría el departamento en dos grupos. */
  const api = nraEnv([ nraAlta({ nombre:'Oliver Pereira', cedula:'13481920', departamento:'Operaciónes',
    cargo:'Conductor jefe', sexo:'Masculino', edad:'48', telefono:'0424-1', email:'oli@aero.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Oliver Pereira', 'Cédula':'13481920',
                    'Departamento':'Operaciones', 'Cargo':'Conductor', 'Rol en la app':'Empleado', 'Nivel de riesgo':'3' });
  api.nominaSincronizarTodas(true);
  const h = api.__enHoja('Oliver Pereira');
  PRUEBAS.igual(h['Departamento'], 'Operaciones', '🔴 el departamento de la hoja manda · el alta decía «Operaciónes»');
  PRUEBAS.igual(h['Cargo'], 'Conductor', '🔴 y el cargo también');
  PRUEBAS.igual(h['Rol en la app'], 'Empleado', '🔴 el rol no se toca');
  PRUEBAS.igual(h['Nivel de riesgo'], '3', '🔴 ni el nivel de riesgo');
  PRUEBAS.igual(h['Edad'], '48', 'guarda: lo que SÍ es de la persona se reflejó · si no, el caso pasaría por no hacer nada');
  /* La fuente de la regla, no una lista copiada acá. */
  const tabla = (CTX.gs.match(/var NOMINA_DESDE_ALTA_COLS = \[([\s\S]*?)\];/) || [])[1] || '';
  PRUEBAS.cierto(tabla.length > 0, 'guarda: se encontró la tabla en el .gs real');
  PRUEBAS.igual(tabla.match(/k:"(rol|nivel|esSupervisor|esMedico|esHseq|esPiloto|idPiloto)"/g), null,
    '🔴 y la tabla del servidor no nombra el rol, el nivel, ni la marca de piloto');
});

PRUEBAS.caso('🔴 la marca de piloto NO se refleja: en el alta nunca está vacía y rompería el tri-estado de P118', () => {
  if (nraSin()) return;
  /* `regValorDe_` con `bool:true` devuelve SIEMPRE «Sí» o «No». Reflejarla habría escrito un «No»
     duro en la nómina de todo el que la tuviera en blanco — y vacío significa «RRHH no llenó», no
     «no es piloto». Quien saque la licencia después no podría volver a serlo desde la app. */
  const api = nraEnv([ nraAlta({ nombre:'Heikys Hernández', cedula:'13717544', departamento:'Operaciones',
    sexo:'Femenino', edad:'46', telefono:'0414-5556677', email:'hei@aero.com', esPiloto:'No', idPiloto:'' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Heikys Hernández', 'Cédula':'13717544', 'Departamento':'Operaciones' });
  api.nominaSincronizarTodas(true);
  const h = api.__enHoja('Heikys Hernández');
  PRUEBAS.igual(h['¿Es piloto?'], '',
    '🔴 la celda sigue VACÍA · el alta decía «No» y escribirlo la convertiría en una decisión de RRHH que nadie tomó');
  PRUEBAS.igual(h['Sexo'], 'Femenino', 'guarda: lo demás sí se reflejó');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · sin alta no se inventa nada, y la segunda corrida no vuelve a escribir', () => {
  if (nraSin()) return;
  const api = nraEnv([]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Rubén Torres', 'Cédula':'3227963', 'Departamento':'Mantenimiento' });
  api.nominaSincronizarTodas(true);
  const h = api.__enHoja('Rubén Torres');
  PRUEBAS.igual([h['Sexo'], h['Edad'], h['Teléfono'], h['Email']], ['','','',''],
    '⚠️ sin fila en «Registrados Fatiga» las celdas siguen vacías · si se llenaran, los casos de arriba estarían pasando por otra razón');

  const api2 = nraEnv([ nraAlta({ nombre:'Rubén Torres', cedula:'3227963', departamento:'Mantenimiento',
    cargo:'Coordinador', sexo:'Masculino', edad:'76', telefono:'0412-3334455', email:'rub@aero.com' }) ]);
  api2.__crearHoja();
  api2.__ponerFila({ 'Nombre y apellido':'Rubén Torres', 'Cédula':'3227963', 'Departamento':'Mantenimiento' });
  /* ⚠️ Se cuentan las completadas Y las fallidas: contar sólo las que salieron bien dejaría pasar
     en verde el caso de una celda que la hoja rechaza y se reintenta cada 5 minutos para siempre. */
  const tocadas = i => (i && i.empresas ? i.empresas : [].concat(i || []))
    .reduce((n, e) => n + ((e && e.completadasDesdeAlta) || []).length + ((e && e.completarFallaron) || []).length, 0);
  PRUEBAS.alMenos(tocadas(api2.nominaSincronizarTodas(true)), 1, 'guarda: la primera corrida reflejó a alguien');
  /* La hoja se «toca» a mano porque en producción escribir mueve su `lastUpdated` y acá no. Sin
     esto la segunda corrida se saltearía entera y el cero de abajo no mediría la convergencia:
     mediría que el atajo funciona, que es otra cosa. */
  api2.__tocarHoja();
  PRUEBAS.igual(tocadas(api2.nominaSincronizarTodas(true)), 0,
    '⚠️ la segunda no toca nada AUNQUE LA CORRIDA SÍ SE EJECUTE · sin esto el sync escribiría en la hoja del cliente cada 5 minutos para siempre');
  PRUEBAS.igual(api2.__enHoja('Rubén Torres')['Edad'], '76', 'y el dato sigue puesto');
});

PRUEBAS.caso('🔴 una celda que la empresa YA llenó no se pisa con un dato viejo del alta', () => {
  if (nraSin()) return;
  /* El caso que el verificador marcó como destructivo: la persona se registró en agosto y puso su
     gmail; en septiembre RRHH cargó la nómina con el correo corporativo. Reflejar «siempre» habría
     reemplazado el corporativo por el gmail, sin confirmación, por un disparador de 5 minutos, en
     un archivo que es del cliente — y RRHH no lo podía corregir. El ADR 004 lo dice: las filas ya
     registradas son «16 personas de varias empresas, casi ninguna con nómina cargada». */
  const api = nraEnv([ nraAlta({ nombre:'Alexander Medina', cedula:'6318692', departamento:'Almacén',
    cargo:'Coordinador', sexo:'Masculino', edad:'58', telefono:'0412-1112233', email:'ale@gmail.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Alexander Medina', 'Cédula':'6318692', 'Departamento':'Almacén',
                    'Email':'alexander.medina@aerosilva.org' });
  api.nominaSincronizarTodas(true);
  const h = api.__enHoja('Alexander Medina');
  PRUEBAS.igual(h['Email'], 'alexander.medina@aerosilva.org',
    '🔴 el correo que cargó RRHH se queda · un dato viejo del alta no es una decisión reciente');
  PRUEBAS.igual(h['Teléfono'], '0412-1112233',
    'guarda: el hueco SÍ se llenó · si no, el caso pasaría por no hacer nada');

  /* Y cuando ella LO EDITA, ahí sí manda — es el otro lado de la misma regla. */
  const r = JSON.parse(api.manejar({ action:'registro', _post:true, dispositivoId:'d1',
    nombre:'Alexander Medina', cedula:'6318692', empresa:'Aeroambulancias Silva',
    email:'nuevo@gmail.com', departamento:'Almacén', cargo:'Coordinador',
    sexo:'Masculino', edad:'58', telefono:'0412-1112233' }).getContent());
  PRUEBAS.cierto(r.ok, 'guarda: el registro se aceptó');
  api.__tocarHoja();
  api.nominaSincronizarTodas(true);
  PRUEBAS.igual(api.__enHoja('Alexander Medina')['Email'], 'nuevo@gmail.com',
    '🔴 pero lo que ella acaba de editar SÍ pisa · es la diferencia entre un dato viejo y una decisión');
});

PRUEBAS.caso('🔴 quien se da de alta por PRIMERA vez llega a la hoja de su empresa', () => {
  if (nraSin()) return;
  /* La rama de fila NUEVA de `accionRegistro` no sellaba, así que el caso más común —RRHH carga
     nombre y cédula, la persona completa el resto— no llegaba nunca: nadie toca la hoja, el atajo
     se saltea la corrida, y su segunda apertura tampoco lo rescata porque ahí ya no hay cambio. */
  const api = nraEnv([]);            // todavía no se registró nadie
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'María Pérez', 'Cédula':'19876543', 'Departamento':'Operaciones' });
  api.nominaSincronizarTodas(true);  // el sync ya corrió una vez: deja las marcas del atajo puestas
  const r = JSON.parse(api.manejar({ action:'registro', _post:true, dispositivoId:'d2',
    nombre:'María Pérez', cedula:'19876543', empresa:'Aeroambulancias Silva',
    email:'maria@aero.com', departamento:'Operaciones', cargo:'Despachante',
    sexo:'Femenino', edad:'29', telefono:'0414-7778899' }).getContent());
  PRUEBAS.cierto(r.ok && r.nuevo, 'guarda: entró por la rama de fila NUEVA · ' + JSON.stringify(r).slice(0, 70));
  /* Sin tocar la hoja: es justo el escenario en que el atajo la dejaba invisible. */
  api.nominaSincronizarTodas(true);
  const h = api.__enHoja('María Pérez');
  PRUEBAS.igual([h['Sexo'], h['Edad'], h['Email']], ['Femenino','29','maria@aero.com'],
    '🔴 sus datos llegaron sin que nadie tocara la hoja · el sello del alta destraba el atajo');
});

PRUEBAS.caso('⚠️ y la nómina sigue siendo el RESPALDO de quien nunca cargó el dato', () => {
  if (nraSin()) return;
  /* La otra mitad del cambio, que no tenía ningún caso: los cuatro campos pasaron de TECHO a
     RESPALDO, no desaparecieron. Quien no los tiene en su alta los recibe de la nómina. */
  const api = nraEnv([ nraAlta({ nombre:'Luis González', cedula:'14626680', departamento:'Operaciones',
    cargo:'Supervisor', sexo:'Masculino', edad:'46', telefono:'', email:'' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Luis González', 'Cédula':'14626680', 'Departamento':'Operaciones',
                    'Teléfono':'0426-1234567', 'Email':'luis@aerosilva.org' });
  api.nominaSincronizarTodas(true);
  const p = api.perfilDePersona('Aeroambulancias Silva', api.cedulaNorm('14626680'));
  PRUEBAS.igual(p.telefono, '0426-1234567',
    '⚠️ el teléfono lo pone la nómina · `perfilPonerSiFalta` es respaldo, no desaparición');
  PRUEBAS.igual(p.email, 'luis@aerosilva.org', 'y el correo también');
  PRUEBAS.igual(p.sexo, 'Masculino', 'guarda: lo que sí cargó sigue viniendo de su alta');
});

PRUEBAS.caso('🔴 una celda con FÓRMULA no se toca, ni siquiera si evalúa a vacío', () => {
  if (nraSin()) return;
  /* `getValues()` devuelve el valor calculado, no la fórmula. Un `=IF(...;"";...)` en Edad se veía
     como un hueco y se destruía: la fórmula se perdía y la celda quedaba en texto. Era el ÚNICO
     camino por el que la PRIMERA corrida podía escribir sobre una celda con contenido —la lista de
     editados arranca vacía— y escribir celda por celda protege a las vecinas, no a la de destino. */
  const api = nraEnv([ nraAlta({ nombre:'Alexander Medina', cedula:'6318692', departamento:'Almacén',
    cargo:'Coordinador', sexo:'Masculino', edad:'58', telefono:'0412-1112233', email:'ale@aero.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Alexander Medina', 'Cédula':'6318692', 'Departamento':'Almacén' });
  const sh = api.__hoja();
  const cab = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x => String(x||''));
  const colEdad = cab.indexOf('Edad') + 1;
  PRUEBAS.alMenos(colEdad, 1, 'guarda: la hoja tiene columna Edad');
  sh.getRange(2, colEdad).setFormula('=IF(TRUE;"";99)');   // evalúa a vacío
  api.nominaSincronizarTodas(true);
  PRUEBAS.igual(String(sh.getRange(2, colEdad).getFormula() || ''), '=IF(TRUE;"";99)',
    '🔴 la fórmula sigue ahí · verla vacía no la convierte en un hueco');
  PRUEBAS.igual(api.__enHoja('Alexander Medina')['Teléfono'], '0412-1112233',
    'guarda: los huecos de verdad SÍ se llenaron · si no, el caso pasaría por no hacer nada');
});

PRUEBAS.caso('🔴 un hueco de la EMPRESA se llena con la grafía que la hoja ya usa', () => {
  if (nraSin()) return;
  /* El caso de Oliver Pereira al revés: con el Departamento VACÍO, llenarlo con el «Operaciónes»
     con tilde de su alta partiría el grupo en dos —en la hoja Y en el CH—, que es lo que la regla
     de no pisar viene a evitar. `depClave()` es la misma derivación que usa el resto del servidor. */
  const api = nraEnv([
    nraAlta({ nombre:'Ana Ruiz', cedula:'11111111', departamento:'Operaciones', cargo:'Despachante',
      sexo:'Femenino', edad:'30', telefono:'0412-1', email:'ana@aero.com' }),
    nraAlta({ nombre:'Oliver Pereira', cedula:'13481920', departamento:'Operaciónes', cargo:'Conductor',
      sexo:'Masculino', edad:'48', telefono:'0424-1', email:'oli@aero.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Ana Ruiz', 'Cédula':'11111111', 'Departamento':'Operaciones' });
  api.__ponerFila({ 'Nombre y apellido':'Oliver Pereira', 'Cédula':'13481920' });   // sin departamento
  api.nominaSincronizarTodas(true);
  PRUEBAS.igual(api.__enHoja('Oliver Pereira')['Departamento'], 'Operaciones',
    '🔴 se usa la grafía de la hoja, no la del alta · dos variantes del mismo departamento son dos grupos');
});

PRUEBAS.caso('⚠️ una celda que la hoja rechaza se nombra, y NO deja el sync reintentando para siempre', () => {
  if (nraSin()) return;
  /* Sin esto: la celda nunca se puede escribir, el sello no se consume, y cada 5 minutos se abre
     el libro del cliente, se leen tres hojas y se appendea otra línea de bitácora — 288 por día,
     en una hoja que R3 prohíbe limpiar. Una celda con validación de datos no va a aceptar el valor
     mañana tampoco: lo que corresponde es decirlo y seguir. */
  const api = nraEnv([ nraAlta({ nombre:'Alexander Medina', cedula:'6318692', departamento:'Almacén',
    cargo:'Coordinador', sexo:'Masculino', edad:'58', telefono:'0412-1112233', email:'ale@aero.com' }) ]);
  api.__crearHoja();
  api.__ponerFila({ 'Nombre y apellido':'Alexander Medina', 'Cédula':'6318692', 'Departamento':'Almacén' });
  const sh = api.__hoja();
  const cab = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x => String(x||''));
  const colTel = cab.indexOf('Teléfono') + 1;
  /* Se rompe la escritura de ESA celda, como haría una validación de datos. */
  const rangoReal = sh.getRange.bind(sh);
  sh.getRange = function(f, c, nf, nc){ const r = rangoReal(f, c, nf, nc);
    if (f === 2 && c === colTel && nf === undefined) {
      return Object.assign(Object.create(Object.getPrototypeOf(r)), r,
        { setValue: () => { throw new Error('La hoja rechazó el valor'); },
          setNumberFormat: () => r, getFormula: () => '' });
    }
    return r; };
  const inf1 = api.nominaSincronizarTodas(true);
  sh.getRange = rangoReal;
  const emp1 = (inf1 && inf1.empresas ? inf1.empresas : [].concat(inf1 || []))[0] || {};
  PRUEBAS.alMenos(((emp1.completarFallaron) || []).length, 1,
    '⚠️ el fallo se NOMBRA · antes era mudo · ' + JSON.stringify((emp1.completarFallaron || [])[0] || {}).slice(0, 90));
  PRUEBAS.cierto(((emp1.completadasDesdeAlta) || []).length > 0,
    '⚠️ y las otras celdas de la MISMA fila se escribieron igual · en 24.7 una excepción cortaba el bucle entero');
  /* Y la corrida siguiente ya no tiene nada que hacer: el sello se consumió. */
  api.__tocarHoja();
  const inf2 = api.nominaSincronizarTodas(true);
  const emp2 = (inf2 && inf2.empresas ? inf2.empresas : [].concat(inf2 || []))[0] || {};
  PRUEBAS.igual(((emp2.completarFallaron) || []).length, 0,
    '⚠️ la corrida siguiente NO reintenta la celda rechazada · sin esto son 288 filas de bitácora por día');
});
