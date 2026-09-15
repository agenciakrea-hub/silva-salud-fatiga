PRUEBAS.grupo('L · Etapa A · las puertas que estaban abiertas sin ninguna credencial');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   MEDIDO CONTRA PRODUCCIÓN el 2026-09-06, con sólo la URL pública que está en el index.html del
   repo abierto y SIN NINGUNA CREDENCIAL: `nomina_empresas` devolvía la lista de empresas clientes,
   `nomina_personas` los 7 nombres completos de HELITEC —cada uno con `yaRegistrado`, o sea a quién
   conviene suplantar— y `empresa_perfil` el perfil con `pideCodigo:false`.
   23 de 52 acciones del endpoint no llaman a `validarAcceso()`.

   Lo pidió Franco después de que su jefe viera las empresas cargadas. El rediseño del login NO
   cierra nada de esto: son cierres de servidor, y por eso van primero y aparte.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function lEnv(nomina){
  return GS.crearEntorno({
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"],
                ['Helitec', 'sup001', 'supervisor', 'Helitec', 'med002', 'dir003']],
    'Sesiones': [["Id","HashToken","Usuario","Dispositivo","Rol","Vista","Empresas","Canonical",
                  "Combinada","Creada","UltimoUso","Estado","Cerrada"]],
    'Credenciales': [["Empresa","Cédula","Usuario","Hash","Sal","Vueltas","Algoritmo","Rol",
                      "Estado","Creada","UltimoAcceso"]],
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
               .concat(nomina || [
                 ['Helitec','Ana Suárez','V-1','Operaciones','Piloto','F',35,'+58123','a@e.com','Sí','','empleado','2']]),
  });
}

PRUEBAS.caso('🔴 L1 · nadie se fabrica una credencial de ADMINISTRADOR registrándose', () => {
  /* `accionCredencialCrear` guardaba en la columna H de `Credenciales` lo que viniera en `p.rol`
     del POST, sin lista blanca. `accionLogin` lo mete en la sesión, y `acc.rol === "admin"`
     desactiva el recorte por empresa en SEIS lugares del panel — el peor, `gestScope`, donde con
     admin la empresa la elige el parámetro. O sea: cualquiera que pudiera crear una credencial se
     hacía administrador y veía todas las empresas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const env = lEnv();
  const api = GS.cargarGs(CTX.gs, env, ['accionCredencialCrear', 'credRolValido']);

  const r = JSON.parse(api.accionCredencialCrear({
    empresa: 'Helitec', cedula: 'V-1', pass: 'unaClaveLarga1', usuario: 'Ana Suárez',
    dispositivoId: 'd', rol: 'admin'          // ← lo que mandaría un atacante
  }).getContent());
  PRUEBAS.cierto(!!r.ok, 'guarda de medibilidad: la credencial se creó · ' + JSON.stringify(r).slice(0, 90));

  const filas = env.hojas ? null : null;
  const cred = api.credRolValido('admin');
  PRUEBAS.falso(cred === 'admin', '⚠️ `admin` no es un rol que se pueda pedir · quedó "' + cred + '"');
  PRUEBAS.igual(api.credRolValido('supervisor'), 'supervisor', 'y los roles reales sí pasan');
  PRUEBAS.igual(api.credRolValido('inventado'), 'empleado',
    '⚠️ y lo desconocido cae en el que MENOS ve · el default seguro es el más restrictivo');
});

PRUEBAS.caso('🔴 L1b · el rol sale de la NÓMINA, no de lo que manda el cliente', () => {
  /* P183 · antes leía el cuerpo de `accionCredencialCrear` con un regex. Ahora se crea la
     credencial por la acción real y se mira la columna Rol de la fila que quedó en `Credenciales`:
     la del padrón, nunca la del POST. Las dos direcciones, para que no dé verde por casualidad. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const filaRol = (rolNomina, rolPost) => {
    const env = lEnv([['Helitec','Ana Suárez','V-1','Operaciones','Piloto','F',35,'+58123','a@e.com','Sí','',rolNomina,'2']]);
    const api = GS.cargarGs(CTX.gs, env, ['accionCredencialCrear']);
    const r = JSON.parse(api.accionCredencialCrear({ empresa:'Helitec', cedula:'V-1', pass:'unaClaveLarga1', usuario:'Ana Suárez', dispositivoId:'d', rol: rolPost }).getContent());
    PRUEBAS.cierto(!!r.ok, 'guarda: la credencial se creó (' + (r.error || 'ok') + ')');
    const filas = env.__libro.getSheetByName('Credenciales').__volcado();
    const fila = filas.slice(1).find(f => String(f[1]).replace(/\D/g, '') === '1');   // `cedulaNorm` guarda sólo los dígitos
    return fila ? String(fila[7]) : '(sin fila)';
  };
  PRUEBAS.igual(filaRol('empleado', 'supervisor'), 'empleado', '⚠️ la nómina dice empleado y el POST pide supervisor → queda EMPLEADO');
  PRUEBAS.igual(filaRol('supervisor', 'empleado'), 'supervisor', 'DISCRIMINADOR · la nómina dice supervisor y el POST pide empleado → queda SUPERVISOR: manda el padrón');
  PRUEBAS.igual(filaRol('empleado', 'admin'), 'empleado', 'y pedir admin por POST no fabrica un administrador');
});

PRUEBAS.caso('🔴 L2 · una colisión de cédula NO entrega datos clínicos de otra empresa', () => {
  /* Ninguna hoja del CH impone unicidad de cédula, y `accionEmpleado` armaba sus datos con
     `leerDatos()` —el CH entero, todas las empresas— recortando sólo por cédula. Dos personas de
     dos clientes distintos con la misma cédula (un error de tipeo alcanza) se veían los registros
     entre sí. No hacía falta atacar nada: pasaba solo.
     P183 · antes buscaba `miEmp` en el cuerpo de `esMio` con un regex. Ahora se siembra el CH con
     dos empresas y la MISMA cédula, se pide como Ana y se cuenta qué registros vuelven. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La hoja del formulario tiene columnas FIJAS (`COL_PERSONA` 2, `COL_DEPTO` 3, `COL_EMPRESA` 73,
     `COL_FECHA` 74, `COL_KSS` 87) y DOS filas de encabezado: se arma cada fila con esa forma. */
  const filaRaw = (persona, empresa, fecha, kss) => { const f = new Array(90).fill(''); f[0] = fecha; f[1] = persona; f[2] = 'Op'; f[72] = empresa; f[73] = fecha; f[86] = String(kss); return f; };
  const cab = new Array(90).fill('');
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo'],
               ['Helitec','Ana Suárez','V-1','Operaciones','Piloto'],
               ['OtraEmpresa','Beto Pérez','V-1','Planta','Operario']],      // misma cédula, otro cliente
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [cab, cab,
                                   filaRaw('Ana Suárez', 'Helitec', '2026-09-01', 7),
                                   filaRaw('Ana Suárez', 'Helitec', '2026-09-02', 5),
                                   filaRaw('Beto Pérez', 'OtraEmpresa', '2026-09-01', 9)],
    'PVT': [['Fecha','Persona','Empresa','Departamento','Validas','RtProm','RtMin','RtMax'],
            ['2026-09-01','Ana Suárez','Helitec','Op','10','300','250','400'],
            ['2026-09-01','Beto Pérez','OtraEmpresa','Planta','10','900','800','990']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionEmpleado']);
  const r = JSON.parse(api.accionEmpleado({ empresa:'Helitec', persona:'Ana Suárez', cedula:'V-1', dispositivoId:'d1' }).getContent());
  PRUEBAS.cierto(!!r.ok, 'guarda: Ana entra con su cédula (' + (r.motivo || r.error || 'ok') + ')');
  const regs = r.registros || [], pvt = r.pvt || [];
  PRUEBAS.igual(regs.length, 2, 'DISCRIMINADOR · le llegan SUS dos registros (los de Helitec)');
  PRUEBAS.igual(regs.map(x => x.kss).sort().join(','), '5,7', 'y son los suyos: KSS 7 y 5');
  PRUEBAS.igual(regs.filter(x => Number(x.kss) === 9).length, 0, '⚠️ el KSS 9 de Beto (OtraEmpresa, misma cédula) NO le llega');
  PRUEBAS.igual(regs.filter(x => /otraempresa/i.test(String(x.empresa || '') + String(x.departamento || ''))).length, 0, 'ninguna fila de OtraEmpresa');
  PRUEBAS.igual(pvt.length, 1, 'y en PVT lo mismo: sólo su prueba de reacción');
  PRUEBAS.igual(pvt.filter(x => Number(x.rt_prom) === 900).length, 0, '⚠️ el PVT de Beto tampoco');
  /* ⚠️ HALLAZGO P183 (no se arregla acá): `construirResolutor` indexa el padrón por cédula SIN
     empresa, así que con la misma cédula en dos clientes Ana vuelve con el NOMBRE de Beto
     (`persona: "Beto Pérez"` en sus propios registros). Los datos clínicos no se cruzan —es lo que
     este caso mide— pero el nombre sí. Anotado en PENDIENTES_USUARIO. */
});

PRUEBAS.caso('🔴 L3/L4 · las dos acciones que eran un oráculo de cédulas tienen freno, y acertar lo limpia', () => {
  /* `nomina_confirmar` y `recuperar_perfil` responden distinto según si la cédula existe, y no
     contaban intentos (0 llamadas a `accFrenado`): se podía iterar el espacio de cédulas hasta
     acertar, y al acertar devolvían teléfono, email, cargo, sexo y edad.
     P183 · antes buscaba `accFrenado(`, `accAnotarFallo(` y `accLimpiar(` en el cuerpo. Ahora se
     llama a cada acción con cédulas equivocadas hasta que la respuesta CAMBIA, y se comprueba que
     acertar reinicia el contador: el mismo dispositivo vuelve a tener todos sus intentos. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lEnv(), ['accionNominaConfirmar', 'accionRecuperarPerfil']);
  const ACCIONES = {
    accionNominaConfirmar: (ced, d) => JSON.parse(api.accionNominaConfirmar({ empresa:'Helitec', persona:'Ana Suárez', cedula: ced, dispositivoId: d }).getContent()),
    accionRecuperarPerfil: (ced, d) => JSON.parse(api.accionRecuperarPerfil({ _post: true, empresa:'Helitec', cedula: ced, dispositivoId: d }).getContent()),
  };
  Object.keys(ACCIONES).forEach(nombre => {
    const llamar = ACCIONES[nombre];
    const d = 'atacante-' + nombre;
    PRUEBAS.falso(!!llamar('V-999', d).ok, nombre + ' · guarda: con cédula equivocada no entra');
    let tope = 0;
    for (let i = 2; i <= 15 && !tope; i++) { if (llamar('V-999', d).motivo === 'muchos_intentos') tope = i; }
    PRUEBAS.cierto(tope > 1, '⚠️ ' + nombre + ' corta en algún intento (cortó en el ' + tope + ')');
    PRUEBAS.igual(llamar('V-999', 'otro-' + nombre).motivo === 'muchos_intentos', false, 'y el freno es por dispositivo: otro teléfono no está frenado');
  });
  /* acertar LIMPIA: por debajo del tope, la cédula correcta entra y después vuelven a quedar todos los intentos */
  const nomOk = (ced, d) => ACCIONES.accionNominaConfirmar(ced, d);
  const d2 = 'torpe';
  let tope2 = 0;
  for (let i = 1; i <= 15 && !tope2; i++) { if (nomOk('V-999', 'medir').motivo === 'muchos_intentos') tope2 = i; }
  for (let i = 1; i < tope2 - 1; i++) nomOk('V-999', d2);           // casi al tope
  const bien = nomOk('V-1', d2);
  PRUEBAS.cierto(!!bien.ok, 'quien teclea mal y después bien, entra (' + (bien.motivo || bien.error || 'ok') + ')');
  let frenadoDespues = false;
  for (let i = 1; i < tope2 - 1; i++) { if (nomOk('V-999', d2).motivo === 'muchos_intentos') frenadoDespues = true; }
  PRUEBAS.falso(frenadoDespues, '⚠️ y acertar REINICIÓ el contador: los mismos intentos de antes no lo frenan');
});

PRUEBAS.caso('⚠️ el freno de verdad corta después de varios intentos fallidos', () => {
  /* R17 · por el camino real: se llama a la acción con una cédula equivocada hasta pasar el tope,
     y se comprueba que la respuesta CAMBIA. Sin esto sólo se estaría comprobando que las palabras
     están escritas en el archivo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lEnv(), ['accionNominaConfirmar']);
  const mal = () => JSON.parse(api.accionNominaConfirmar({
    empresa: 'Helitec', persona: 'Ana Suárez', cedula: 'V-999', dispositivoId: 'atacante'
  }).getContent());

  const primera = mal();
  PRUEBAS.falso(!!primera.ok, 'guarda: con la cédula equivocada no entra');
  PRUEBAS.falso(primera.motivo === 'muchos_intentos', 'y el primer intento NO está frenado todavía');

  let frenado = null;
  for (let i = 0; i < 12 && !frenado; i++) { const r = mal(); if (r.motivo === 'muchos_intentos') frenado = i + 2; }
  PRUEBAS.cierto(!!frenado, '⚠️ en algún momento corta · sin esto se itera el espacio de cédulas entero');

  /* Y el DISCRIMINADOR: otro dispositivo no queda frenado por lo que hizo el primero. */
  const otro = JSON.parse(api.accionNominaConfirmar({
    empresa: 'Helitec', persona: 'Ana Suárez', cedula: 'V-1', dispositivoId: 'otroTelefono'
  }).getContent());
  PRUEBAS.cierto(!!otro.ok,
    '⚠️ el freno es POR DISPOSITIVO · si fuera global, un atacante dejaría a la empresa afuera');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   L6 y L7 · el resto de la Etapa A: las acciones que no tenían NINGUNA defensa.
   Auditadas las 23 una por una. Nueve no tenían ni credencial, ni freno, ni código, ni token:
   ocho de escritura (registro, pvt, reporte_guardar, turno_guardar, operacional_guardar,
   confiabilidad_guardar, consentimiento_guardar, opinion_guardar) y dos de lectura
   (nomina_empresas, empresa_perfil).
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/* Las que SÍ llevan freno. `accionOpinionGuardar` NO está y no es un olvido: es el canal anónimo
   (X2), y un identificador de dispositivo estable identifica al teléfono —y por lo tanto a la
   persona— aunque el texto no lleve nombre. El caso de abajo lo comprueba explícitamente para que
   nadie lo "complete" más adelante creyendo que faltaba. */
const L_ESCRITURAS = ['accionRegistro', 'accionPvt', 'accionReporteGuardar', 'accionTurnoGuardar',
  'accionOperacionalGuardar', 'accionConfiabilidadGuardar', 'accionConsentimientoGuardar'];

PRUEBAS.caso('🔴 L6 · las ocho escrituras sin credencial tienen límite de tasa', () => {
  /* `accFrenado` cuenta FALLOS, y sirve para una contraseña. Una escritura siempre «acierta», así
     que necesitaba otro mecanismo: contar llamadas por dispositivo en una ventana. Sin esto,
     cualquiera con la URL —que está en el index.html del repo público— llena las hojas del
     cliente de filas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba `escrFrenada(p.dispositivoId)` en las primeras líneas de cada función.
     Ahora se INUNDA un dispositivo por el camino real (`escrFrenada` hasta el tope) y se llama a
     cada acción con ese dispositivo y con uno limpio: la respuesta tiene que cambiar. */
  const api = GS.cargarGs(CTX.gs, lEnv(), L_ESCRITURAS.concat(['accionOpinionGuardar', 'escrFrenada']));
  const INUNDADO = 'inundado';
  for (let i = 0; i < 80 && !api.escrFrenada(INUNDADO); i++) {}
  PRUEBAS.cierto(api.escrFrenada(INUNDADO), 'guarda: el dispositivo quedó al tope de escrituras');
  const base = { empresa:'Helitec', persona:'Ana Suárez', nombre:'Ana Suárez', cedula:'V-1', id:'x1', evento:'salida_casa', iso:new Date().toISOString(), version:'1' };
  L_ESCRITURAS.forEach(fn => {
    const conInundado = JSON.parse(api[fn](Object.assign({}, base, { dispositivoId: INUNDADO })).getContent());
    PRUEBAS.igual(conInundado.motivo, 'muchos_envios', '⚠️ ' + fn + ' corta la inundación (respondió ' + (conInundado.motivo || conInundado.error || 'ok') + ')');
    const conLimpio = JSON.parse(api[fn](Object.assign({}, base, { dispositivoId: 'limpio-' + fn })).getContent());
    PRUEBAS.falso(conLimpio.motivo === 'muchos_envios', 'DISCRIMINADOR · ' + fn + ' con otro dispositivo NO está frenada (' + (conLimpio.motivo || conLimpio.error || 'ok') + ')');
  });

  /* ⚠️ Y LA OPINIÓN NO, A PROPÓSITO. Sin esta comprobación, el día que alguien "complete" la lista
     creyendo que faltaba una, rompería el anonimato sin que nada se ponga en rojo. Es exactamente
     lo que me pasó a mí en L6: agregué `dispositivoId` a las ocho sin mirar que una era ésta, y me
     frenó `x2-opinion-anonima.js`. */
  const op = JSON.parse(api.accionOpinionGuardar({ id:'op1', texto:'una opinión', dispositivoId: INUNDADO }).getContent());
  PRUEBAS.falso(op.motivo === 'muchos_envios', '⚠️ la opinión ANÓNIMA no lleva freno por dispositivo · el anonimato vale más que el freno (' + (op.motivo || op.error || 'ok') + ')');
});

PRUEBAS.caso('🔴 L6b · el freno NO traba a nadie sin `dispositivoId` ni si falla el caché', () => {
  /* Las dos reglas importan más que el freno. Hasta la 5.97 estas escrituras no mandaban el campo:
     sin esta guarda, todas caerían en una clave compartida y al pasar el tope se trabarían TODAS
     las personas a la vez. Y una PWA cacheada puede tardar días en actualizarse. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lEnv(), ['escrFrenada']);
  PRUEBAS.falso(api.escrFrenada(''), '⚠️ sin id NO se frena · un cliente viejo no queda afuera');
  PRUEBAS.falso(api.escrFrenada(null), 'ni con null');
  PRUEBAS.falso(api.escrFrenada(undefined), 'ni con undefined');

  /* Y el DISCRIMINADOR: con un id de verdad SÍ frena al pasar el tope. Sin esto, los tres verdes
     de arriba podrían estar dando verde porque la función nunca frena nada. */
  let freno = false;
  for (let i = 0; i < 60 && !freno; i++) freno = api.escrFrenada('dispositivoDePrueba');
  PRUEBAS.cierto(freno, '⚠️ con un id real corta en algún momento · si no, no frena nada');
  PRUEBAS.falso(api.escrFrenada('otroDispositivo'),
    'y otro dispositivo sigue pudiendo escribir · el freno no es global');
});

PRUEBAS.caso('🔴 L7 · la nómina ya no dice a quién conviene suplantar', () => {
  /* `nomina_personas` no pide credencial y devolvía `yaRegistrado` por persona: cuál de los
     nombres todavía no tiene cuenta. Es el paso 2 de la cadena de alta-como-otra-persona.
     Servía para un chip informativo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P183 · antes buscaba `out.push({ nombre: r.nombre })` en el cuerpo. Ahora se pide la lista por
     la acción real, con una persona YA registrada en el padrón: el campo no puede viajar ni cuando
     el servidor lo sabe. */
  const env = lEnv([['Helitec','Ana Suárez','V-1','Operaciones','Piloto','F',35,'+58123','a@e.com','Sí','','empleado','2'],
                    ['Helitec','Beto Pérez','V-2','Operaciones','Piloto','M',40,'+58124','b@e.com','Sí','','empleado','2']]);
  env.__libro.insertSheet('Registrados Fatiga').getRange(1, 1, 2, 4).setValues([['Fecha','Nombre','Cédula','Empresa'], ['2026-09-01','Ana Suárez','V-1','Helitec']]);
  const api = GS.cargarGs(CTX.gs, env, ['accionNominaPersonas']);
  const r = JSON.parse(api.accionNominaPersonas({ empresa:'Helitec' }).getContent());
  PRUEBAS.cierto(!!r.ok && Array.isArray(r.personas), 'guarda: la acción responde la lista (' + (r.error || 'ok') + ')');
  PRUEBAS.igual((r.personas || []).map(x => x.nombre).sort(), ['Ana Suárez', 'Beto Pérez'], 'sigue devolviendo los nombres, que es lo que la pantalla necesita');
  PRUEBAS.igual((r.personas || []).filter(x => 'yaRegistrado' in x).length, 0, '⚠️ `yaRegistrado` no viaja para nadie, ni para Ana, que el padrón sabe que ya se registró');
  PRUEBAS.cierto(JSON.stringify(r).indexOf('yaRegistrado') < 0, 'ni con otro nombre en ninguna parte de la respuesta');
});

PRUEBAS.caso('⚠️ el cliente tolera que `yaRegistrado` no venga', () => {
  /* Publicar un recorte del servidor sin que el cliente lo tolere es como se rompe una app en
     producción. Acá el campo entra en un ternario, así que `undefined` cae en la otra rama y se
     dibuja el chevron de siempre — pero eso hay que COMPROBARLO, no suponerlo. */
  /* P183 · antes leía `nominaFiltrar.toString()`. Ahora se pinta la lista con personas SIN el
     campo (como las manda el servidor desde L7) y se mira lo que quedó en pantalla. */
  const prev = NOM.personas.slice(), prevQ = nominaEl('nomBuscar').value, cont = nominaEl('nomPersonas');
  try {
    nominaEl('nomBuscar').value = '';
    NOM.personas = [{ nombre: 'Ana Suárez' }, { nombre: 'Beto Pérez' }];
    let rompio = null;
    try { nominaFiltrar(); } catch(e){ rompio = String(e); }
    PRUEBAS.igual(rompio, null, '⚠️ sin el campo no rompe');
    PRUEBAS.igual(cont.querySelectorAll('.nom-op').length, 2, 'guarda: pintó a las dos personas');
    PRUEBAS.igual(cont.querySelectorAll('.nom-op-chev').length, 2, 'y cada una lleva el chevron de siempre');
    PRUEBAS.igual(cont.querySelectorAll('.nom-op-ya').length, 0, 'sin ningún «ya se registró»: nadie se entera de a quién conviene suplantar');
    /* discriminador: si el campo VOLVIERA a viajar, la pantalla lo mostraría (es el lugar previsto para la Etapa B) */
    NOM.personas = [{ nombre: 'Ana Suárez', yaRegistrado: true }];
    nominaFiltrar();
    PRUEBAS.igual(cont.querySelectorAll('.nom-op-ya').length, 1, 'DISCRIMINADOR · con el campo puesto, el chip sí se pinta');
  } finally { NOM.personas = prev; nominaEl('nomBuscar').value = prevQ; cont.innerHTML = ''; }
});
