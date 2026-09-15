PRUEBAS.grupo('L9 · «Mi contraseña» no tenía dónde escribir el código que le exigían');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   MEDIDO EN PRODUCCIÓN (tarea `cred_estado`, 2026-09-07): de las 7 personas de HELITEC,
   **CERO tienen contraseña**. O sea que las siete pasan por esta pantalla, y era la única de las
   cinco puertas del código que no tenía campo donde escribirlo.

   El cliente mandaba el código SÓLO si lo encontraba en `altaProgresoCargar()`, que `nominaConfirmar`
   BORRA al terminar el alta y que además vence a las 24 h. Para alguien registrado hace meses eso
   es `null` siempre: recibía «El código de la empresa no es correcto» en una pantalla donde no
   había nada que corregir. Un error verdadero y sin salida, que es peor que no decir nada.

   Por eso L8 no cargó el código: habría trabado a las 7 el mismo día.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 la pantalla tiene un campo para el código', () => {
  /* ⚠️ `CTX.resetear()` PRIMERO, y no es adorno: sin esto el caso falló dos veces seguidas
     buscando `#claveOv #clvCodigo` mientras el elemento SÍ estaba en el DOM. Este era el único
     caso del archivo que no partía de un estado conocido, y el único que fallaba. Lo que deja
     puesto el caso anterior es de él, no de este archivo. */
  CTX.resetear();
  /* ⚠️ `PRUEBAS.existe` ANOTA POR SU CUENTA y devuelve `undefined`. Envolverlo en
     `PRUEBAS.cierto(PRUEBAS.existe(...))` da SIEMPRE rojo, pase lo que pase — y eso fue lo que me
     tuvo tres corridas persiguiendo un elemento que estaba ahí. Lo destapó instrumentar el caso:
     el diagnóstico decía `dentro: true` y el aserto seguía en falso. Una API mal usada miente en
     la dirección más cara: parece un defecto del código que se está probando. */
  PRUEBAS.existe('#claveOv #clvCodigo', '⚠️ el campo existe, y DENTRO de la pantalla de contraseña');
  PRUEBAS.existe('#claveOv #clvCodigoCampo', 'y su contenedor, para poder ocultarlo');
  const lbl = document.querySelector('#clvCodigoCampo label');
  PRUEBAS.cierto(!!lbl, 'guarda de medibilidad: tiene etiqueta');
  PRUEBAS.igual(lbl && lbl.getAttribute('data-i18n'), 'nom_codigo_lbl',
    '⚠️ R14 · el texto sale de `t()`, y reusa la clave que ya existe en el alta');
});

PRUEBAS.caso('⚠️ nace OCULTO · quien no lo necesita no ve un campo de más', () => {
  CTX.resetear();
  const campo = document.getElementById('clvCodigoCampo');
  PRUEBAS.cierto(!!campo, 'guarda: está el contenedor');
  /* Se entra por el camino real: `clvAbrir()` lo prepara. Con el perfil de empresa sin
     `pideCodigo` —el estado de HOY para HELITEC— el campo no se muestra. */
  try { localStorage.removeItem('silva_fatiga_empresa_perfil_v1'); } catch(e){}
  clvCodigoPreparar();
  PRUEBAS.cierto(campo.hidden, '⚠️ sin perfil de empresa guardado, oculto');

  empresaPerfilGuardar({ empresa:'E', nombre:'E', pideCodigo:false });
  clvCodigoPreparar();
  PRUEBAS.cierto(campo.hidden, '⚠️ y con una empresa que NO pide código, también');
});

PRUEBAS.caso('🔴 aparece cuando la empresa SÍ pide código', () => {
  CTX.resetear();
  empresaPerfilGuardar({ empresa:'E', nombre:'E', pideCodigo:true });
  clvCodigoPreparar();
  PRUEBAS.falso(document.getElementById('clvCodigoCampo').hidden,
    '⚠️ con `pideCodigo` se muestra · es el caso del día que se cargue el código');
});

PRUEBAS.caso('🔴 y el ERROR del servidor lo abre igual · la red del camino de arriba', () => {
  /* El perfil guardado de la empresa puede estar viejo o no existir —una app que nunca hizo el
     alta en ese teléfono no lo tiene—. Sin esta red, esa persona veía el error y nada más. */
  CTX.resetear();
  try { localStorage.removeItem('silva_fatiga_empresa_perfil_v1'); } catch(e){}
  clvCodigoPreparar();
  PRUEBAS.cierto(document.getElementById('clvCodigoCampo').hidden, 'guarda: arranca oculto');
  clvCodigoRevelar();
  PRUEBAS.falso(document.getElementById('clvCodigoCampo').hidden,
    '⚠️ `clvCodigoRevelar()` lo abre · lo llama la respuesta `codigo_invalido`');
});

PRUEBAS.caso('⚠️ el envío usa lo que la persona escribió, no sólo el progreso del alta', () => {
  /* El defecto entero era que `altaProgresoCargar()` fuera la ÚNICA fuente: se borra al terminar
     el alta (index.html, en `nominaConfirmar`) y vence a las 24 h. */
  /* P183 · antes leía `String(clvGuardar)`. Ahora se toca «Crear mi contraseña» con el campo del
     código escrito y con la memoria del alta cargada, y se mira qué código VIAJÓ en el POST. */
  const oFetch = window.fetchConReloj, oOff = window.offHayConexion, prevPerfil = getProfile(), prevNom = NOM.codigo, prevModo = CLV_MODO;
  const cuerpos = [];
  try {
    window.fetchConReloj = (u, o) => { try { cuerpos.push(JSON.parse(o.body)); } catch(e){} return new Promise(() => {}); };
    window.offHayConexion = () => true; CLV_MODO = 'crear';
    setProfile({ nombre: 'Ana Suárez', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto' });
    document.getElementById('clvPass').value = 'unaClaveLarga1'; document.getElementById('clvPass2').value = 'unaClaveLarga1';
    NOM.codigo = 'DEL-ALTA';
    document.getElementById('clvCodigo').value = 'ESCRITO-AHORA';
    clvGuardar(null);
    PRUEBAS.igual(cuerpos.length, 1, 'guarda: salió el pedido de crear la credencial');
    PRUEBAS.igual(cuerpos[0] && cuerpos[0].codigo, 'ESCRITO-AHORA', '⚠️ el campo de la pantalla tiene PRIORIDAD · si no, un código viejo taparía al nuevo');
    document.getElementById('clvCodigo').value = '';
    try { btnSpin(document.getElementById('clvBtn'), false); } catch(e){}
    clvGuardar(null);
    PRUEBAS.igual(cuerpos[1] && cuerpos[1].codigo, 'DEL-ALTA', 'y con el campo vacío viaja el respaldo: el código del alta en curso');
  } finally {
    window.fetchConReloj = oFetch; window.offHayConexion = oOff; NOM.codigo = prevNom; CLV_MODO = prevModo;
    document.getElementById('clvPass').value = ''; document.getElementById('clvPass2').value = ''; document.getElementById('clvCodigo').value = '';
    try { btnSpin(document.getElementById('clvBtn'), false); } catch(e){}
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
  }
  /* y dentro del respaldo, la memoria de ESTA alta va antes que lo guardado de una anterior */
  const prevNom2 = NOM.codigo, prevProg = localStorage.getItem(K_ALTA_PROGRESO);
  try {
    const prevEmp = NOM.empresa; NOM.empresa = 'Consorcio HELITEC'; NOM.codigo = 'DE-UNA-ALTA-VIEJA'; altaProgresoGuardar(); NOM.empresa = prevEmp;   // el progreso se guarda desde NOM y necesita empresa
    NOM.codigo = 'DE-ESTA-ALTA';
    PRUEBAS.igual(altaCodigoVigente(), 'DE-ESTA-ALTA', 'con las dos memorias, gana la del alta en curso');
    NOM.codigo = '';
    PRUEBAS.igual(altaCodigoVigente(), 'DE-UNA-ALTA-VIEJA', 'y sin ella, el progreso guardado');
  } finally {
    NOM.codigo = prevNom2;
    if (prevProg == null) localStorage.removeItem(K_ALTA_PROGRESO); else localStorage.setItem(K_ALTA_PROGRESO, prevProg);
  }
});

PRUEBAS.caso('⚠️ la respuesta de código inválido abre el campo · por el camino real', () => {
  /* P183 · antes buscaba `codigo_invalido` y `clvCodigoRevelar` en `clvGuardar`. Ahora el servidor
     (espiado) responde `codigo_invalido` y después `codigo_frenado`: el campo del código tiene que
     quedar a la vista. Se restaura en el `.finally()` de la promesa (R18). */
  const oFetch = window.fetchConReloj, oOff = window.offHayConexion, prevPerfil = getProfile(), prevModo = CLV_MODO;
  const campo = document.getElementById('clvCodigoCampo');
  const responder = (motivo) => { window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: false, motivo: motivo, error: 'x' }) }); campo.hidden = true; try { btnSpin(document.getElementById('clvBtn'), false); } catch(e){} clvGuardar(null); return new Promise(res => setTimeout(res, 30)); };
  window.offHayConexion = () => true; CLV_MODO = 'crear';
  setProfile({ nombre: 'Ana Suárez', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto' });
  document.getElementById('clvPass').value = 'unaClaveLarga1'; document.getElementById('clvPass2').value = 'unaClaveLarga1';
  return responder('codigo_invalido').then(() => {
    PRUEBAS.cierto(campo.hidden === false, '⚠️ con `codigo_invalido` el campo del código se REVELA · antes sólo pintaba el error');
    return responder('codigo_frenado');
  }).then(() => {
    PRUEBAS.cierto(campo.hidden === false, 'y también cuando el servidor dice que hubo demasiados intentos');
    return responder('clave_debil');
  }).then(() => {
    PRUEBAS.cierto(campo.hidden === true, 'DISCRIMINADOR · con otro motivo el campo sigue guardado');
  }).finally(() => {
    window.fetchConReloj = oFetch; window.offHayConexion = oOff; CLV_MODO = prevModo; campo.hidden = true;
    document.getElementById('clvPass').value = ''; document.getElementById('clvPass2').value = ''; document.getElementById('clvErr').textContent = '';
    try { btnSpin(document.getElementById('clvBtn'), false); } catch(e){}
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
  });
});

PRUEBAS.caso('⚠️ abrir la pantalla NO depende de la red (R7)', () => {
  /* Si `clvAbrir` pidiera el perfil de la empresa al servidor para saber si mostrar el campo, sin
     señal la hoja no se abriría o se abriría mal. Se lee del guardado, y la red es la de abajo. */
  /* P183 · antes leía `String(clvCodigoPreparar)`. Ahora se prepara la pantalla con la red espiada
     y el perfil de empresa GUARDADO: cero pedidos, y el campo aparece o no según `pideCodigo` del
     guardado. */
  const oFetch = window.fetchConReloj, oFetch2 = window.fetch, oDash = window.dashRequest, prevPerfilEmp = localStorage.getItem(K_EMPRESA_PERFIL), prevPerfil = getProfile();
  const campo = document.getElementById('clvCodigoCampo');
  let pedidos = 0;
  try {
    window.fetchConReloj = () => { pedidos++; return new Promise(() => {}); };
    window.fetch = () => { pedidos++; return new Promise(() => {}); };
    window.dashRequest = () => { pedidos++; return new Promise(() => {}); };
    setProfile({ nombre: 'Ana Suárez', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto' });
    localStorage.setItem(K_EMPRESA_PERFIL, JSON.stringify({ empresa: 'Consorcio HELITEC', pideCodigo: true, nombre: 'Consorcio HELITEC' }));
    clvCodigoPreparar();
    PRUEBAS.igual(pedidos, 0, '⚠️ abrir la pantalla no pide nada a la red (R7)');
    PRUEBAS.cierto(campo.hidden === false, 'y el campo aparece porque el perfil GUARDADO dice que la empresa pide código');
    localStorage.setItem(K_EMPRESA_PERFIL, JSON.stringify({ empresa: 'Consorcio HELITEC', pideCodigo: false, nombre: 'Consorcio HELITEC' }));
    clvCodigoPreparar();
    PRUEBAS.cierto(campo.hidden === true, 'DISCRIMINADOR · si el guardado dice que no pide, el campo no aparece');
    PRUEBAS.igual(pedidos, 0, 'y sigue sin pedidos');
  } finally {
    window.fetchConReloj = oFetch; window.fetch = oFetch2; window.dashRequest = oDash; campo.hidden = true;
    if (prevPerfilEmp == null) localStorage.removeItem(K_EMPRESA_PERFIL); else localStorage.setItem(K_EMPRESA_PERFIL, prevPerfilEmp);
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
  }
});

PRUEBAS.caso('🔴 un código que NO se mandó no quema un intento', () => {
  /* El freno del código es por dispositivo y lo comparten todas las acciones de esa empresa. Si
     tocar «Crear mi contraseña» sin código contara como intento fallido, la persona a la que hay
     que NO trabar se frenaba sola en pocos toques — incluido el camino que la salva. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  /* P183 · antes buscaba la línea del `if` en `puertaCodigo`. Ahora se golpea la puerta muchas veces
     SIN código (lo que hace quien toca «Crear mi contraseña» sin saber que hace falta uno): nunca
     frena. Con códigos EQUIVOCADOS, frena. */
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno({
    'Config Empresa': [['Empresa','Clave','Valor'], ['Helitec','codigoRegistro','ABC123']],
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'], ['Helitec','clave-sup','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo'], ['Helitec','Ana Suárez','V-1','Op','Piloto']],
  }), ['accionNominaPersonas']);
  const golpear = (codigo, d) => JSON.parse(api.accionNominaPersonas({ empresa: 'Helitec', codigo: codigo, dispositivoId: d }).getContent());
  let frenadoSin = false;
  for (let i = 0; i < 15; i++) { if (golpear('', 'sin-codigo').motivo === 'codigo_frenado') frenadoSin = true; }
  PRUEBAS.falso(frenadoSin, '🔴 quince toques SIN código no queman ningún intento · el freno es contra quien PRUEBA códigos');
  let frenadoMal = false;
  for (let i = 0; i < 15 && !frenadoMal; i++) { if (golpear('MALO' + i, 'probando').motivo === 'codigo_frenado') frenadoMal = true; }
  PRUEBAS.cierto(frenadoMal, 'DISCRIMINADOR · quince códigos equivocados sí frenan');
});
