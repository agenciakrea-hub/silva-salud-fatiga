PRUEBAS.grupo('P135 · los callejones sin salida');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Tres callejones que la auditoría del login encontró, más uno que apareció al arreglarlos: un
   reingreso EXITOSO también dejaba la app oculta, no sólo «Ahora no».

   · `lgnCerrar()` no reponía nada: ni el splash si la persona se arrepiente, ni la app si el login
     salió bien. `#app` arranca con `display:none` y sólo `appRevelar(true)` lo muestra — eso corre
     al arrancar y al final de `avanzarAlta()`, ninguna de las dos veces en el reingreso.
   · `saveProfile` validaba contraseñas de supervisor/médico de forma asíncrona sin bloquear el
     formulario: la guarda que debía cubrir el hueco (`dataset.busy`) nunca se escribía, así que
     tocar cualquier campo mientras la verificación estaba en vuelo rehabilitaba «Guardar» y un
     segundo toque disparaba una segunda verificación en paralelo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p135Reingreso(){
  /* ⚠️ LA SUITE NO RECARGA LA PÁGINA ENTRE CASOS. En un arranque real `#app` empieza con
     `display:none` y sólo se revela cuando corresponde; acá el caso anterior puede haberla dejado
     visible con el perfil de prueba por defecto. Se apaga a mano para que el escenario arranque
     igual que un reingreso de verdad — si no, "sigue oculta" podría dar falso positivo por venir
     ya oculta de antes, no por lo que se está midiendo. */
  appRevelar(false);
  localStorage.clear();
  reingresoGuardar('Consorcio HELITEC');
}

PRUEBAS.caso('🔴 «Ahora no» en el reingreso repone el splash, no deja la pantalla en blanco', () => {
  p135Reingreso();
  PRUEBAS.cierto(splashIngresar() !== false || true, 'guarda: se puede invocar');
  const abrio = lgnAbrir();
  PRUEBAS.cierto(abrio !== false, 'guarda: el login se abre sin perfil (P121)');
  PRUEBAS.cierto(document.getElementById('loginOv').classList.contains('show'),
    'guarda: el overlay del login está abierto');
  lgnCerrar();
  PRUEBAS.igual(document.getElementById('app').style.display, 'none',
    'guarda: sin perfil completo, la app sigue oculta (no hay nada que revelar)');
  PRUEBAS.cierto(document.getElementById('splashOv').classList.contains('show'),
    '⚠️ el splash vuelve · antes quedaban splash Y login cerrados, con #app en display:none — nada dibujado');
});

PRUEBAS.caso('⚠️ pero si YA hay perfil completo, no reabre el splash de arriba — el discriminador', () => {
  /* Si alguien cierra este login DESPUÉS de haber entrado por otro camino, reabrir el splash
     encima de una app ya visible sería peor que no hacer nada. */
  const previo = getProfile();
  try {
    setProfile({ nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                 cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' });
    appRevelar(true);
    lgnAbrir();
    document.getElementById('splashOv').classList.remove('show');
    lgnCerrar();
    PRUEBAS.igual(document.getElementById('splashOv').classList.contains('show'), false,
      '⚠️ con perfil completo no se reabre el splash · la app ya estaba a la vista');
  } finally {
    appRevelar(false);
    if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE);
  }
});

PRUEBAS.caso('🔴 un reingreso EXITOSO revela la app — no sólo el que se cancela', async () => {
  /* El hallazgo que no estaba en la auditoría original: ni siquiera un login CORRECTO mostraba la
     app. `appRevelar(true)` sólo corre al arrancar y al final de `avanzarAlta()`; ninguna de las
     dos pasa por el reingreso.
     ⚠️ SE LLAMA A `lgnEntrar()` DE VERDAD, no se arma el resultado a mano. La primera versión de
     este caso copiaba adentro del test el mismo bloque que ya está en `lgnEntrar` —incluida la
     línea del arreglo—, así que medía su propia copia y no el código real: un discriminador que
     rompía la línea de `lgnEntrar` seguía dando verde acá. Es el defecto R17 de siempre, y ya van
     varias veces en este repo. Se mockea sólo `fetchConReloj`, que es el borde real del sistema.
     ⚠️ CON RESTAURACIÓN: la versión anterior tampoco devolvía el perfil a como estaba, y ese
     perfil COMPLETO sobrevivía hasta la PRÓXIMA carga de la suite —`_complete` de P100 se calcula
     una sola vez, al cargar la app— rompiendo un archivo que nadie había tocado, once casos
     después. */
  const previo = getProfile();
  const prevFetch = fetchConReloj;
  try {
    p135Reingreso();
    lgnAbrir();
    document.getElementById('lgnCed').value = '12345678';
    document.getElementById('lgnPass').value = 'unaClave123';
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({
      ok: true, sesion: 'token-de-prueba',
      persona: { nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Ops',
                 cargo:'Piloto', sexo:'F', edad:'34', telefono:'0412', email:'a@a.com' }
    }) });
    const btn = document.getElementById('lgnBtn');
    lgnEntrar(btn);
    await new Promise(r => setTimeout(r, 60));
    PRUEBAS.igual(perfilCompleto(getProfile()), true, 'guarda: el perfil que llegó está completo');
    PRUEBAS.igual(document.getElementById('app').style.display, '',
      '⚠️ la app se revela · antes quedaba con display:none pese al login correcto');
  } finally {
    fetchConReloj = prevFetch;
    appRevelar(false);
    if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE);
  }
});

PRUEBAS.caso('🔒 «Volver» desde el paso `empresa` — ya no aplica: ese paso quedó inalcanzable', () => {
  /* La auditoría lo encontró ANTES de que P132 (mismo día) cerrara «Mi empresa no me dio código».
     Ese cierre sacó el único llamador de `nominaAbrirListaEmpresas`, así que el paso 'empresa' —y
     el camino viejo entero detrás de él— quedó sin forma de alcanzarse. Arreglar «Volver» ahí
     habría sido arreglar un camino muerto. Este caso deja constancia de que sigue muerto: si algún
     día alguien reconecta ese llamador, hay que volver a mirar el «Volver». */
  const sinComentarios = x => x.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const fuente = sinComentarios([...document.querySelectorAll('script')].map(x => x.textContent).join('\n'));
  const llamadores = (fuente.match(/(?<!function\s)nominaAbrirListaEmpresas\s*\(\s*\)/g) || []).length;
  PRUEBAS.igual(llamadores, 0,
    '⚠️ sigue sin llamadores · si aparece uno, el paso `empresa` vuelve a ser alcanzable y «Volver» hay que revisarlo');
});

/* ── saveProfile: el hueco de doble envío ─────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 mientras se verifica la contraseña de supervisor, el formulario queda bloqueado', async () => {
  /* Antes: `dataset.busy` nunca se escribía, así que `setupCheckReady()` —enganchada a `input` y
     `change` de TODO el `.sheet`— rehabilitaba «Guardar» apenas la persona tocaba otro campo,
     con el botón todavía diciendo «Verificando…». Se entra por `saveProfile()` real y se mide el
     `inert` que `conBloqueo` le pone al panel mientras el pedido está en vuelo.
     ⚠️ LA PROMESA SE RESUELVE, no queda colgada para siempre: `cargaBloquear` lleva un CONTADOR
     (`dataset.cargaBloqN`) para soportar bloqueos anidados, y `conCarga` lo decrementa cuando la
     promesa real se resuelve. La primera versión de este caso usaba una promesa que nunca
     resolvía y sacaba el `inert` A MANO en el `finally` — eso dejaba el contador interno
     desincronizado del atributo del DOM, y el próximo bloqueo legítimo sobre `#setup` quedaba
     pegado para siempre. Se lo cazó porque DOCE casos de OTROS archivos empezaron a fallar
     después de este, todos tocando `#setup` o pantallas que dependen de él — la señal de que el
     daño no se quedó en este archivo. */
  const previo = getProfile();
  const prevFetch = fetchConReloj;
  const prevListas = { empresas: SETUP_LISTS.empresas.slice(), cargadas: SETUP_LISTS_LOADED };
  let resolver;
  try {
    /* Sin esto `saveProfile()` corta ANTES de llegar a la contraseña: con `SETUP_LISTS.empresas`
       vacío (su valor inicial) y `SHEETS_DASHBOARD_URL` presente, la validación de empresa da
       "cargando" y `ok` queda en `false` — el caso no llegaría a medir nada. Se deja cargada a
       mano para no depender de `loadSetupLists()`, que es un fetch aparte y no lo que este caso
       quiere medir. */
    SETUP_LISTS.empresas = ['Consorcio HELITEC'];
    SETUP_LISTS_LOADED = true;
    fetchConReloj = () => new Promise(res => { resolver = res; });
    openSetup(false);
    document.getElementById('inName').value = 'Ana Suárez';
    document.getElementById('inCed').value = '12345678';
    document.getElementById('inEmp').value = 'Consorcio HELITEC';
    document.getElementById('inDep').value = 'Operaciones';
    document.getElementById('inCargo').value = 'Piloto';
    document.getElementById('inSexo').value = 'Femenino';
    document.getElementById('inEdad').value = '34';
    document.getElementById('inTelefono').value = '04121112233';
    document.getElementById('inEmail').value = 'ana@ejemplo.com';
    document.getElementById('inEsSupervisor').checked = true;
    document.getElementById('inSupPass').value = 'unaClave123';
    saveProfile();
    await new Promise(r => setTimeout(r, 30));   // deja que el `.then` de arriba corra
    const sheet = document.querySelector('#setup .sheet');
    PRUEBAS.cierto(sheet.hasAttribute('inert'),
      '⚠️ el panel entero queda bloqueado mientras se verifica · antes sólo el botón, y su guarda estaba muerta');
    /* Se resuelve con la forma real de `validarSupervisorCreds` sin red: `{json:()=>...}`. */
    resolver({ json: () => Promise.resolve({ ok:true, valido:false }) });
    await new Promise(r => setTimeout(r, 50));
    PRUEBAS.cierto(!sheet.hasAttribute('inert'),
      'y se libera solo cuando el pedido de verdad terminó · el contador vuelve a cero');
  } finally {
    fetchConReloj = prevFetch;
    if (resolver) { try { resolver({ json: () => Promise.resolve({ ok:false }) }); } catch(e){} }
    await new Promise(r => setTimeout(r, 20));
    closeSetup();
    SETUP_LISTS.empresas = prevListas.empresas;
    SETUP_LISTS_LOADED = prevListas.cargadas;
    if (previo) setProfile(previo); else localStorage.removeItem(K_PROFILE);
  }
});
