PRUEBAS.grupo('P132 · las puertas del código y los botones tocables');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Franco, mirando la app: «tiene botones que no se deberían de poder tocar, tiene muchas opciones
   para saltarse el código, y eso no debería ser así». Las dos quejas, medidas:

   · En la pantalla que EXISTE para pedir el código había CUATRO controles y TRES eran salidas para
     no ponerlo. `.nom-pie` vive fuera de los pasos y `nominaPaso()` sólo controlaba dos de sus
     botones; los otros dos no tenían ni id, o sea que ninguna línea de JS los miraba.
   · «Ya me había registrado» pedía `action=listas`, que —medido contra producción el 2026-09-07,
     sin una sola credencial— devuelve 11 empresas clientes y 14 departamentos. El padrón entero a
     un toque de la primera pantalla. Es lo que marcó el jefe de Franco.
   · Cinco botones de acción principal nunca recibían `disabled` fuera de `btnSpin`: con el campo
     vacío se veían verdes, se podían apretar, y lo único que pasaba era un texto de error.

   ⚠️ LA MITAD QUE NO ES DE ESTE ARCHIVO: hoy el código NO TIENE CERRADURA. `codigoRegistro` está
   vacío en `Config Empresa`, así que las cinco `puertaCodigo()` del servidor devuelven `null` y
   cualquier código pasa. Estos casos vigilan que la app no REGALE lo que el servidor todavía no
   protege; cerrar la cerradura es otra cosa y depende del semáforo de L10.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p132Abrir(){
  localStorage.clear();
  nominaAbrir();
}
function p132Visibles(sel){
  return [...document.querySelectorAll(sel)]
    .filter(e => e.getBoundingClientRect().height > 0)
    .map(e => (e.textContent || '').trim());
}

PRUEBAS.caso('🔴 la pantalla del código NO ofrece salidas para saltearlo', () => {
  /* Las tres salidas llevaban: a la lista de empresas (`nominaSinCodigo`), al padrón por
     `action=listas` (`recuperarAbrir`) y al portal con los roles a la vista (`nominaSoyGestor`). */
  p132Abrir();
  const btns = p132Visibles('#nominaOv button');
  PRUEBAS.igual(NOM.paso, 'codigo', 'guarda: se está midiendo el paso del código');
  PRUEBAS.cierto(btns.length > 0, 'guarda: hay botones visibles (si no, el caso no mide nada)');
  ['nomYaReg', 'nomSoyGestor', 'nomNoEstoy'].forEach(id => {
    const el = document.getElementById(id);
    PRUEBAS.cierto(!!el, 'guarda: existe #' + id + ' — si lo renombran, este caso deja de medir');
    PRUEBAS.igual(el && el.style.display, 'none',
      '⚠️ #' + id + ' oculto en el paso del código · antes los tres se veían acá');
  });
});

PRUEBAS.caso('⚠️ pero SÍ están donde tienen sentido — el discriminador', () => {
  /* Sin esto, esconderlos para siempre daría verde arriba y dejaría sin salida a quien la
     necesita: el que reinstala, el que no figura en la nómina y el que viene sólo al panel. */
  p132Abrir();
  nominaPaso('cedsola');
  PRUEBAS.cierto(document.getElementById('nomYaReg').style.display !== 'none',
    '⚠️ «Ya me había registrado» aparece en la cédula · quien reinstala llega igual, un paso después');
  nominaPaso('empresa');
  PRUEBAS.cierto(document.getElementById('nomNoEstoy').style.display !== 'none',
    '⚠️ «No estoy en la lista» aparece donde hay una lista de la cual faltar');
});

PRUEBAS.caso('🔴 «Mi empresa no me dio código» ya NO abre la lista de empresas', () => {
  /* Era la puerta grande: dos toques desde la primera pantalla hasta los siete nombres de la
     nómina, porque `nominaElegirEmpresa` ve `pideCodigo:false` y salta derecho a las personas. */
  p132Abrir();
  nominaSinCodigo();
  PRUEBAS.igual(NOM.paso, 'codigo',
    '⚠️ se queda en el código · antes pasaba a «empresa», que es la lista de clientes');
  const err = document.getElementById('nomCodErr');
  PRUEBAS.cierto(err && err.textContent.length > 20,
    '⚠️ y dice a quién pedírselo · dejarlo mudo lo deja golpeando una puerta cerrada');
});

PRUEBAS.caso('🔒 la lista de empresas no es alcanzable desde ningún control', () => {
  /* Se mide sobre el fuente porque lo que hay que impedir es que alguien vuelva a engancharla.
     `nominaAbrirListaEmpresas` puede seguir existiendo —el flujo viejo la documenta— pero no puede
     tener un llamador. */
  const sinComentarios = x => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
                              .replace(/<!--[\s\S]*?-->/g, ' ');
  const fuente = sinComentarios([...document.querySelectorAll('script')].map(x => x.textContent).join('\n'));
  /* ⚠️ SIN CONTAR LA DECLARACIÓN. `function nominaAbrirListaEmpresas()` matchea el mismo patrón
     que una llamada, así que la primera versión de este caso daba 1 con cero llamadores. */
  const llamadas = (fuente.match(/(^|[^\w.])nominaAbrirListaEmpresas\s*\(\s*\)/g) || [])
    .filter(x => !/function\s*$/.test(fuente.slice(0, fuente.indexOf(x)).slice(-12))).length
    - (fuente.match(/function\s+nominaAbrirListaEmpresas/g) || []).length;
  PRUEBAS.igual(Math.max(0, llamadas), 0,
    '⚠️ quedan ' + Math.max(0, llamadas) + ' llamadas a la lista de empresas · cada una es el padrón de clientes a la vista');
  /* ⚠️ `action=listas` SIGUE PIDIÉNDOSE por `loadSetupLists`, y eso es sabido: lo usa el
     desplegable de DEPARTAMENTOS, que no es el padrón de clientes. Lo que se vigila es que las
     empresas que trae no se le pinten a nadie. El cierre de la acción es del lado del endpoint y
     está anotado en PENDIENTES_USUARIO.md: sacarla del cliente no cierra nada, porque la URL es
     pública. */
  PRUEBAS.alMenos(2, (fuente.match(/action=listas/g) || []).length,
    'como mucho un pedido de listas, el de los departamentos');
});

/* ── LOS BOTONES QUE NO SE DEBERÍAN PODER TOCAR ───────────────────────────────────────────── */

PRUEBAS.caso('🔴 «Continuar» del código está bloqueado con el campo vacío', () => {
  p132Abrir();
  const btn = document.getElementById('nomBtnCodigo'), inp = document.getElementById('nomCodigo');
  PRUEBAS.cierto(!!btn && !!inp, 'guarda: existen el botón y el campo');
  PRUEBAS.igual(btn.disabled, true,
    '⚠️ con el campo vacío NO se puede tocar · antes se apretaba y sólo aparecía un texto de error');
  inp.value = 'ABC-1234'; inp.dispatchEvent(new Event('input', { bubbles:true }));
  PRUEBAS.igual(btn.disabled, false,
    '⚠️ y al escribir se habilita — el discriminador: un gateo que nunca abre deja a todos afuera');
  inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles:true }));
  PRUEBAS.igual(btn.disabled, true, 'y al borrar vuelve a bloquearse');
});

PRUEBAS.caso('🔴 el gateo SOBREVIVE a que un pedido vuelva con error', () => {
  /* ⚠️ LA TRAMPA, y es la razón por la que el gateo vive en un solo lugar en vez de en cinco
     `oninput` sueltos: `btnSpin(btn, false)` hacía `btn.disabled = false` INCONDICIONAL. Cada vez
     que el servidor contestaba con error, el botón se rehabilitaba con el campo vacío y el gateo
     mentía a partir de ahí. Se entra por `btnSpin`, que es lo que corre de verdad. */
  p132Abrir();
  const btn = document.getElementById('nomBtnCodigo');
  PRUEBAS.igual(btn.disabled, true, 'guarda: arranca bloqueado');
  btnSpin(btn, true);                     // como cuando sale el pedido
  btnSpin(btn, false);                    // y como cuando vuelve con error
  PRUEBAS.igual(btn.disabled, true,
    '⚠️ sigue bloqueado con el campo vacío · antes acá quedaba verde y clickeable');
});

PRUEBAS.caso('⚠️ un botón SIN gateo no se rompe por el cambio de btnSpin', () => {
  /* El discriminador del cambio en `btnSpin`: los botones que nunca tuvieron gateo tienen que
     seguir comportándose igual, o el arreglo deja media app con botones grises. */
  const b = document.createElement('button');
  b.id = 'p132SinGateo'; b.textContent = 'x';
  document.body.appendChild(b);
  try {
    btnSpin(b, true);
    PRUEBAS.igual(b.disabled, true, 'mientras carga, bloqueado');
    btnSpin(b, false);
    PRUEBAS.igual(b.disabled, false, '⚠️ y al terminar se rehabilita, como siempre');
  } finally { b.remove(); }
});

PRUEBAS.caso('🔴 «Entrar» del login pide las dos cosas antes de habilitarse', () => {
  /* Sin gateo, el botón se veía verde con los dos campos vacíos y el servidor contestaba «Usuario o
     contraseña incorrecta» — un error que suena a contraseña equivocada cuando no se escribió nada.
     Se entra por `lgnAbrir`, que es quien registra el gateo. */
  const previo = getProfile();
  try {
    setProfile({ empresa:'Consorcio HELITEC', cedula:'12345678', nombre:'Prueba' });
    PRUEBAS.cierto(lgnAbrir() !== false, 'guarda: el login abre');
    const btn = document.getElementById('lgnBtn');
    PRUEBAS.cierto(!!btn, 'guarda: el botón «Entrar» tiene id (era un submit sin id)');
    PRUEBAS.igual(btn.disabled, true, '⚠️ con los dos campos vacíos, bloqueado');
    const ced = document.getElementById('lgnCed'), pass = document.getElementById('lgnPass');
    ced.value = '12345678'; ced.dispatchEvent(new Event('input', { bubbles:true }));
    PRUEBAS.igual(btn.disabled, true, '⚠️ con la cédula sola tampoco · faltan las dos');
    pass.value = 'unaClave'; pass.dispatchEvent(new Event('input', { bubbles:true }));
    PRUEBAS.igual(btn.disabled, false, 'con las dos, sí');
  } finally {
    try { lgnCerrar(); } catch(e){}
    if (previo) setProfile(previo);
  }
});


PRUEBAS.caso('🔴 el desplegable de empresa NO lista a los clientes', () => {
  /* Acá se pintaban las 11 empresas y encima se podía elegir otra: `saveProfile` acepta cualquiera
     de la lista oficial, así que mudarse a otro cliente pasaba la validación. */
  const previo = getProfile();
  try {
    SETUP_LISTS.empresas = ['Cliente Uno', 'Cliente Dos', 'Cliente Tres'];
    const inp = document.getElementById('inEmp'), panel = document.getElementById('panelEmp');
    PRUEBAS.cierto(!!inp && !!panel, 'guarda: existen el campo y el panel del combo');
    inp.value = '';
    comboBuild('Emp');
    const opciones = panel.querySelectorAll('.combo-opt').length;
    PRUEBAS.igual(opciones, 0,
      '⚠️ ninguna empresa sugerida · antes salían las ' + SETUP_LISTS.empresas.length + ' cargadas');
    /* El discriminador: los DEPARTAMENTOS sí se siguen sugiriendo — no son el padrón de clientes
       y sin ellos la persona tiene que adivinar cómo se escribe el suyo. */
    SETUP_LISTS.departamentos = ['Operaciones', 'Mantenimiento'];
    const inD = document.getElementById('inDep');
    if (inD){
      inD.value = '';
      comboBuild('Dep');
      PRUEBAS.alMenos(document.getElementById('panelDep').querySelectorAll('.combo-opt').length, 2,
        '⚠️ y los departamentos SÍ se sugieren · si esto también se apagó, el arreglo fue de más');
    }
  } finally { if (previo) setProfile(previo); }
});

PRUEBAS.caso('🔴 la empresa ya resuelta no se puede cambiar desde el formulario', () => {
  const inp = document.getElementById('inEmp');
  try {
    inp.value = 'Consorcio HELITEC';
    setupEmpresaFijar();
    PRUEBAS.igual(inp.readOnly, true,
      '⚠️ con empresa resuelta por el alta, de sólo lectura · editarla servía para mudarse de cliente');
    /* El discriminador: quien se da de alta a mano llega SIN empresa y tiene que poder escribirla,
       o queda trabado sin poder completar su perfil. */
    inp.value = '';
    setupEmpresaFijar();
    PRUEBAS.igual(inp.readOnly, false,
      '⚠️ y sin empresa se puede escribir · si no, «No estoy en la lista» queda sin salida');
  } finally { inp.value = ''; try { setupEmpresaFijar(); } catch(e){} }
});
