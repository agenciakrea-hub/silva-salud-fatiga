PRUEBAS.grupo('P164 · lo que el alta de prueba encontró en producción');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El 2026-09-10 se recorrió el alta ENTERA contra producción con una persona de prueba en Empresa
   Demo — código → cédula → «¿eres tú?» → datos → consentimiento → tamaño → contraseña → app — y
   se verificó en el CH en qué hoja cayó cada cosa (R15). Funcionó, y encontró tres cosas:

   1 · NADIE PUEDE DARSE DE ALTA HOY. `accionCodigoEmpresa` sólo resuelve por `codigoRegistro`, y
       no hay ninguno cargado para ninguna empresa (P133, bloqueado a propósito por el semáforo).
       No es un bug de código: está anotado, y este archivo no lo prueba.
   2 · EL CÓDIGO SE PEDÍA DOS VECES. La persona lo escribía en la primera pantalla y «Crear mi
       contraseña» se lo pedía otra vez, vacío, cuatro pantallas después — y si no lo reescribía,
       el servidor decía «El código de la empresa no es correcto», que es falso: no lo mandó.
       `clvCodigoPreparar` y `clvGuardar` leían sólo `altaProgresoCargar()`, que `nominaConfirmar`
       borra al confirmar la identidad, mientras `NOM.codigo` lo tenía en memoria y nadie miraba.
   3 · EL TELÉFONO CON «+» SE GUARDÓ COMO `#ERROR!`. `appendRow` interpreta los valores como si se
       tipearan y el formato `@` de la celda no lo detiene; `setValues` sobre el rango con `@`, sí.
       Alcanza a todo texto libre que entre por `appendRow`: teléfonos, opiniones, comentarios.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── 2 · el código que ya se escribió, de donde esté ─────────────────────────────────────────── */

PRUEBAS.caso('🔴 «Crear mi contraseña» viene con el código que la persona YA escribió', () => {
  /* Se entra por `clvAbrir()`, que es lo que abre la pantalla de verdad, con el estado exacto en
     que la deja el alta: `NOM.codigo` en memoria y el progreso guardado YA BORRADO por
     `nominaConfirmar`. Ése es el estado que dejaba el campo vacío. */
  /* `NOM` es `const`: se muta y se restaura, no se reasigna. */
  const antesCod = NOM.codigo;
  const ov = document.getElementById('claveOv');
  const tenia = ov.classList.contains('show');
  try {
    NOM.codigo = 'ABC-PRUEBA-1';
    try { altaProgresoLimpiar(); } catch (e) {}
    clvAbrir();
    const input = document.getElementById('clvCodigo');
    PRUEBAS.igual(input.value, 'ABC-PRUEBA-1',
      '🔴 prellenado con el código de ESTA alta — antes quedaba vacío porque el progreso ya no estaba');
  } finally {
    NOM.codigo = antesCod;
    ov.classList.remove('show'); if (tenia) ov.classList.add('show');
    try { syncScrollLock(); } catch (e) {}
  }
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · sin código en memoria ni guardado, el campo queda vacío', () => {
  /* Si `altaCodigoVigente()` inventara algo, lo de arriba pasaría por la razón equivocada. */
  const antesCod = NOM.codigo;
  const ov = document.getElementById('claveOv');
  const tenia = ov.classList.contains('show');
  try {
    NOM.codigo = '';
    try { altaProgresoLimpiar(); } catch (e) {}
    clvAbrir();
    PRUEBAS.igual(document.getElementById('clvCodigo').value, '', 'nada que prellenar, nada prellenado');
  } finally {
    NOM.codigo = antesCod;
    ov.classList.remove('show'); if (tenia) ov.classList.add('show');
    try { syncScrollLock(); } catch (e) {}
  }
});

PRUEBAS.caso('⚠️ y el progreso GUARDADO sigue valiendo como respaldo · quien cerró la app y volvió', () => {
  const antesCod = NOM.codigo;
  try {
    NOM.codigo = '';
    /* Con la forma REAL que escribe `altaProgresoGuardar`: sin `empresa`, `altaProgresoCargar` lo descarta. */
    try { localStorage.setItem(K_ALTA_PROGRESO, JSON.stringify({ empresa:'Empresa Demo', codigo:'GUARDADO-9', ts: Date.now() })); } catch (e) {}
    PRUEBAS.igual(altaCodigoVigente(), 'GUARDADO-9', 'sin memoria de esta alta, se usa lo guardado');
    NOM.codigo = 'MEMORIA-1';
    PRUEBAS.igual(altaCodigoVigente(), 'MEMORIA-1', '⚠️ y la memoria de ESTA alta manda sobre lo guardado');
  } finally {
    NOM.codigo = antesCod;
    try { altaProgresoLimpiar(); } catch (e) {}
  }
});

PRUEBAS.caso('🔴 `clvGuardar` manda el código aunque el campo esté vacío', () => {
  /* R17 · se espía el POST real. Con el campo vacío y `NOM.codigo` en memoria, el cuerpo tiene
     que llevar `codigo`; antes iba sin él y el servidor lo rechazaba. */
  const antesCod = NOM.codigo;
  const oFetch = window.fetch, oPerfil = getProfile();
  const cuerpos = [];
  try {
    NOM.codigo = 'DEL-ALTA-7';
    try { altaProgresoLimpiar(); } catch (e) {}
    setProfile(Object.assign({}, oPerfil || {}, { nombre:'Prueba P164', cedula:'1', empresa:'Empresa Demo' }));
    document.getElementById('clvPass').value = 'Clave-larga-1!';
    document.getElementById('clvPass2').value = 'Clave-larga-1!';
    document.getElementById('clvCodigo').value = '';
    window.fetch = function (u, o) { try { cuerpos.push(JSON.parse(o.body)); } catch (e) {} return new Promise(() => {}); };
    const btn = document.getElementById('clvBtn');
    clvGuardar(btn);
    PRUEBAS.igual(cuerpos.length, 1, 'guarda: salió UN pedido');
    PRUEBAS.igual(cuerpos[0] && cuerpos[0].action, 'credencial_crear', 'y es el de crear la credencial');
    PRUEBAS.igual(cuerpos[0] && cuerpos[0].codigo, 'DEL-ALTA-7',
      '🔴 con el código de la memoria del alta · antes viajaba sin `codigo` y el servidor lo rechazaba');
  } finally {
    window.fetch = oFetch; NOM.codigo = antesCod;
    if (oPerfil) setProfile(oPerfil); else localStorage.removeItem(K_PROFILE);
    document.getElementById('clvPass').value = ''; document.getElementById('clvPass2').value = '';
    try { btnSpin(document.getElementById('clvBtn'), false); } catch (e) {}
    try { cargaBloquear(document.querySelector('#claveOv .sheet'), 'reset'); } catch (e) {}
  }
});

/* ── 3 · appendRow no respeta el formato de texto ────────────────────────────────────────────── */

PRUEBAS.caso('🔴 EL EMULADOR MODELA LA TRAMPA · appendRow con «+» da #ERROR!', () => {
  /* El discriminador del bloque entero: si el emulador no lo modelara, todos los casos de abajo
     pasarían con el `.gs` viejo. Verificado en producción el 2026-09-10, fila 41 de
     `Registrados Fatiga`: «+58 412 0000000» quedó como `#ERROR!` con toda la hoja en `@`. */
  const env = GS.crearEntorno({ 'X': [['A','B']] });
  const sh = env.__libro.getSheetByName('X');
  sh.getRange(1, 1, sh.getMaxRows(), 2).setNumberFormat('@');   // como hace el endpoint
  sh.appendRow(['+58 412 0000000', '= hola']);
  const v = sh.getDataRange().getValues()[1];
  PRUEBAS.igual(v[0], '#ERROR!', '🔴 el «+» inicial se pierde por appendRow, aunque la hoja esté en @');
  PRUEBAS.igual(v[1], '#ERROR!', 'y el «=» también');
  sh.getRange(3, 1, 1, 2).setNumberFormat('@').setValues([['+58 412 0000000', '= hola']]);
  const w = sh.getDataRange().getValues()[2];
  PRUEBAS.igual(w[0], '+58 412 0000000', '⚠️ por setValues con el formato puesto, el texto se respeta');
});

function p164EnvReg(){
  const CAB = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
    'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
    'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
  const env = GS.crearEntorno({
    'Registrados Fatiga': [CAB],
    'Accesos': [['Usuario','Contraseña','Rol','Empresas'], ['demo','x','supervisor','Empresa Demo']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Opiniones': [['IdOpinion','Empresa','Mes','Texto']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionRegistro','accionOpinionGuardar','filaAgregar_']);
  api.__env = env;
  return api;
}

PRUEBAS.caso('🔴 el teléfono con «+» llega ENTERO a Registrados Fatiga', () => {
  /* Se entra por `accionRegistro`, que es el camino real de la fila nueva. */
  const api = p164EnvReg();
  const r = JSON.parse(api.accionRegistro({ nombre:'Ana Prueba', cedula:'77777777', empresa:'Empresa Demo',
    telefono:'+58 412 0000000', email:'a@b.c', dispositivoId:'d-p164' }).getContent());
  PRUEBAS.cierto(r.ok && r.nuevo, 'guarda: la fila se creó · ' + JSON.stringify(r));
  const v = api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues();
  const cab = v[0].map(String); const fila = v[v.length - 1];
  PRUEBAS.igual(String(fila[cab.indexOf('Teléfono')]), '+58 412 0000000',
    '🔴 el «+58» se guarda tal cual · antes quedaba #ERROR! en producción');
});

PRUEBAS.caso('🔴 una opinión que empieza con «+1» o con «=» no se pierde', () => {
  /* El caso más caro: es el canal ANÓNIMO, y una opinión perdida no la reclama nadie. */
  const api = p164EnvReg();
  api.accionOpinionGuardar({ id:'op-a', empresa:'Empresa Demo', mes:'2026-09', texto:'+1 a lo que dijeron del turno' });
  api.accionOpinionGuardar({ id:'op-b', empresa:'Empresa Demo', mes:'2026-09', texto:'= no me parece justo' });
  const v = api.__env.__libro.getSheetByName('Opiniones').getDataRange().getValues();
  const textos = v.slice(1).map(f => String(f[3])).sort();
  PRUEBAS.igual(textos, ['+1 a lo que dijeron del turno', '= no me parece justo'],
    '🔴 las dos opiniones enteras · el comentario de `obtenerHojaOpiniones` prometía esto y no lo cumplía');
});

PRUEBAS.caso('⚠️ ningún camino con texto de la persona vuelve a `appendRow` · sobre la fuente', () => {
  /* R17 · lo que este caso vigila es una tentación de mantenimiento, no un valor: `appendRow` es
     más corto y parece equivalente. Las cinco funciones que escriben texto libre no pueden usarlo. */
  const gs = CTX.gs;
  ['accionRegistro','upsertPorId','accionReporteGuardar','accionTareaGuardar','generarInforme'].forEach(fn => {
    const i = gs.indexOf('function ' + fn + '(');
    const fin = gs.indexOf('\n}', i);
    const cuerpo = i >= 0 ? gs.slice(i, fin > 0 ? fin + 2 : i + 4000) : '';
    PRUEBAS.cierto(cuerpo.length > 0, 'tiene que encontrarse ' + fn);
    /* Los `appendRow(headers)` / `appendRow(X_HEAD)` de crear la hoja son legítimos: encabezados
       fijos, nunca texto de la persona. Lo que no puede haber es un appendRow con una FILA. */
    const conDatos = (cuerpo.match(/\b(sh|shp)\.appendRow\(([^)]*)\)/g) || [])
      .filter(m => !/appendRow\(\s*(headers|[A-Z_]+_HEAD|[A-Z_]+_CAB)\s*\)/.test(m));
    PRUEBAS.igual(conDatos, [],
      '⚠️ ' + fn + ' no puede usar appendRow con datos: el texto que empieza con + o = se pierde');
    PRUEBAS.cierto(/filaAgregar_\(/.test(cuerpo), 'y usa `filaAgregar_`, que pone el formato antes de escribir');
  });
});
