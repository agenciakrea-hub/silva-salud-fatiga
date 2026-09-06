PRUEBAS.grupo('P100 · el ofrecimiento del rol al terminar el alta');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El ADR 002 fijó la regla: el rol se PROPONE (la nómina o el código de supervisor) y se CONFIRMA
   (la contraseña de la empresa). Nunca al revés. P093 hizo que el rol viajara y se guardara, P099
   agregó el código y P101 dejó que la nómina lo QUITE. Faltaba la pantalla: el rol llegaba, se
   guardaba en el perfil y no se le ofrecía a nadie — para llegar al panel había que ir a editar el
   perfil, marcar una casilla y escribir una contraseña que alguien te pasó por fuera de la app.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17), Y ACÁ ESO SIGNIFICA DOS COSAS DISTINTAS:
   1) La pantalla NO se abre llamando a `rolOfrecerAbrir()`. Se llama a `avanzarAlta()`, que es la
      única función que decide qué falta en el alta, y se mira si el overlay llegó a la pantalla.
      Un caso que comprobara que `rolOfrecerAbrir()` devuelve `true` no probaría nada de lo que
      importa: lo que se rompe es que el paso no esté enganchado en la máquina de estados. Es
      exactamente lo que pasó con el selector de período (P089), que devolvía cuatro botones
      perfectos que no se dibujaban en ninguna vista.
   2) Para la guarda `!_complete` se ARRANCA LA APP DE NUEVO, en un iframe anidado. `_complete` es
      una `const` que se calcula una sola vez al arrancar: dentro de la app ya viva no se puede
      cambiar, así que cualquier prueba que no vuelva a arrancar estaría midiendo otra cosa.

   ⚠️ POR QUÉ LA GUARDA `!_complete` TIENE SU PROPIO CASO. Sin ella, a las siete personas de
   Consorcio HELITEC —ya registradas, que nunca pasaron por esta pantalla— les aparecería un
   formulario de contraseña al abrir la app, sin haber pedido nada. Es una app en producción con
   pilotos reales: ese es el defecto más caro que este prompt podía dejar.

   ⚠️ NO SE USA `setTimeout` PARA CEDER EL TURNO. La pestaña está oculta de forma permanente (ver
   pruebas/LEEME.md) y Chrome estrangula sus temporizadores a ~1 s. Las microtareas no se
   estrangulan y alcanzan para que corran los `.then` de una promesa ya resuelta.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P100_EMP = 'Empresa P100';
const P100_CED = 'V-100100';
const P100_PASS = 'clave-de-la-empresa';

/* Un perfil COMPLETO (`perfilCompleto()` los pide todos) con el rol que la nómina propuso. Es el
   estado exacto en el que queda alguien que acaba de confirmar sus datos en el alta. */
const P100_PERFIL = { nombre:'Ana Suárez P100', cedula:P100_CED, empresa:P100_EMP,
                      departamento:'Operaciones', cargo:'Operadora', sexo:'Femenino', edad:'34',
                      telefono:'04141111111', email:'ana.p100@ejemplo.co', esPiloto:false };

/* Lo que registra el `fetch` de mentira. Se vacía antes de cada medición. */
const P100_RED = { llamadas: [] };

function p100Stub(resp){
  return (url, opts) => {
    P100_RED.llamadas.push({ url:String(url), body:(opts && opts.body) || '',
                             metodo:(opts && opts.method) || 'GET' });
    if (resp === 'falla') return Promise.reject(new TypeError('Failed to fetch'));
    if (resp == null) return new Promise(() => {});                 // en vuelo para siempre
    return Promise.resolve({ ok:true, status:200, type:'cors', json: () => Promise.resolve(resp) });
  };
}
async function p100Tick(n){ for (let i = 0; i < (n || 24); i++) await Promise.resolve(); }

/* ── Guardar y devolver el estado, entero ─────────────────────────────────────────────────────
   Esta suite corre dentro de la app de verdad, así que un caso que se olvide de restaurar le
   cambia el mundo a los 700 que vienen después. */
function p100Guardar(){
  const o = {};
  for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
  return { ls:o, dash:(typeof DASH !== 'undefined' ? DASH : null) };
}
function p100Restaurar(prev){
  localStorage.clear();
  Object.keys(prev.ls).forEach(k => { try { localStorage.setItem(k, prev.ls[k]); } catch(e){} });
  const ov = document.getElementById('rolOv'); if (ov) ov.classList.remove('show');
  const cv = document.getElementById('claveOv'); if (cv) cv.classList.remove('show');
  const co = document.getElementById('consent'); if (co) co.classList.remove('show');
  const tx = document.getElementById('textoOverlay'); if (tx) tx.classList.remove('show');
  const nm = document.getElementById('nominaOv'); if (nm) nm.classList.remove('show');
  const st = document.getElementById('setup'); if (st) st.classList.remove('show');
  try { DASH = prev.dash; } catch(e){}
  try { syncScrollLock(); } catch(e){}
  try { miRolPintar(); } catch(e){}
}

/* Deja el dispositivo en el estado EXACTO de alguien que acaba de terminar de cargar sus datos:
   consentimiento firmado, tamaño de texto elegido, contraseña propia ya ofrecida (para que el paso
   5 del alta no se meta en el medio) y el perfil completo con el rol que propuso la nómina.
   Devuelve lo que hay que restaurar. */
function p100Preparar(extra){
  const prev = p100Guardar();
  localStorage.clear();
  const cons = { items:{} };
  CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
  localStorage.setItem(K_CONSENT, JSON.stringify(cons));
  localStorage.setItem(K_TEXTO, '1');
  setProfile(Object.assign({}, P100_PERFIL, extra || {}));
  clvMarcarOfrecida();          // el paso de la contraseña propia va DESPUÉS: acá estorba
  P100_RED.llamadas.length = 0;
  return prev;
}
function p100Abierto(){ const o = document.getElementById('rolOv'); return !!o && o.classList.contains('show'); }

/* ─────────────────────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('⚠️ guarda de medibilidad · la pantalla y sus funciones existen', () => {
  /* Si esto falla, TODO lo de abajo mide el aire: un caso que abre un overlay inexistente y
     comprueba que no se ve pasa siempre. Un cero sin discriminador no es un resultado (R17). */
  PRUEBAS.existe('#rolOv', 'el overlay del ofrecimiento tiene que estar en el documento');
  PRUEBAS.existe('#rolOv #rolPass', 'con su campo de contraseña de la empresa');
  PRUEBAS.existe('#miRolBtn', 'y la entrada permanente en la pestaña Más (ADR 002: "no se pierde")');
  PRUEBAS.igual(typeof rolOfrecerAbrir, 'function', 'rolOfrecerAbrir tiene que existir');
  PRUEBAS.igual(typeof rolConfirmar, 'function', 'rolConfirmar también');
  PRUEBAS.igual(typeof rolPosponer, 'function', 'y rolPosponer');
  PRUEBAS.igual(typeof miRolPintar, 'function', 'y la fila de Más se pinta desde JS');
});

PRUEBAS.caso('🔴 EL CAMINO REAL · avanzarAlta() abre la pantalla cuando la nómina propone un rol', () => {
  /* No se llama a `rolOfrecerAbrir()`: se llama a la máquina de estados del alta, que es lo único
     que corre de verdad al terminar de cargar los datos. Lo que se rompe en la vida real no es la
     función, es que el paso no esté enganchado. */
  const prev = p100Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  try {
    PRUEBAS.falso(_complete,
      '⚠️ precondición · en el arnés la app arranca SIN perfil completo, que es la situación de ' +
      'quien se está dando de alta. Si esto sale cierto, los casos de abajo no miden lo que dicen');
    avanzarAlta();
    PRUEBAS.cierto(p100Abierto(),
      '🔴 al terminar el alta con un rol propuesto, la pantalla del ofrecimiento tiene que APARECER · ' +
      'hasta P100 el rol llegaba del servidor y no se le ofrecía a nadie');
    PRUEBAS.falso(document.getElementById('consent').classList.contains('show'),
      'y no se quedó trabada en el consentimiento (si esto falla, el caso de arriba no probó nada)');
    PRUEBAS.falso(document.getElementById('claveOv').classList.contains('show'),
      'ni se adelantó el paso de la contraseña propia: el rol va ANTES (la de empresa es la que abre el panel)');
    const ti = (document.getElementById('rolTitulo').textContent || '');
    PRUEBAS.cierto(ti.indexOf(t('rol_supervisor')) >= 0,
      'y el título nombra el rol concreto · "tu empresa te registró como algo" no le sirve a nadie');
  } finally { p100Restaurar(prev); }
});

PRUEBAS.caso('🔴 EL DISCRIMINADOR · sin rol propuesto no aparece ni un paso extra', () => {
  /* Es el caso de la MAYORÍA y el que no puede costar nada. Sin este caso, "abrir siempre" pasaría
     por arreglo y todo el personal vería un formulario de contraseña que no le corresponde. */
  const prev = p100Preparar({ rol:'empleado' });
  try {
    avanzarAlta();
    PRUEBAS.falso(p100Abierto(),
      '🔴 con la nómina diciendo "empleado" NO se ofrece nada · es el caso de casi todo el personal');
    PRUEBAS.igual(rolPropuesto(getProfile()), '', 'y no hay ningún rol para ofrecer');
  } finally { p100Restaurar(prev); }

  const prev2 = p100Preparar({ rol:'' });
  try {
    avanzarAlta();
    PRUEBAS.falso(p100Abierto(), 'y con la celda vacía tampoco · "sin dato" nunca es "gestiona"');
  } finally { p100Restaurar(prev2); }

  const prev3 = p100Preparar({ rol:'0414-555-1234' });
  try {
    avanzarAlta();
    PRUEBAS.falso(p100Abierto(),
      '⚠️ ni con basura en la celda · si una empresa pega su Excel con las columnas corridas, un ' +
      'teléfono cae en la columna del rol. La lista de roles ofrecibles es CERRADA a propósito');
  } finally { p100Restaurar(prev3); }
});

PRUEBAS.caso('⚠️ a quien YA tiene el rol activado no se le vuelve a ofrecer', () => {
  /* Quien marcó la casilla en su perfil y escribió la contraseña ya pasó por esto. Ofrecerle otra
     vez lo que ya tiene es ruido, y encima le pediría la contraseña que ya dio. */
  const prev = p100Preparar({ rol:'supervisor', esSupervisor:true });
  try {
    avanzarAlta();
    PRUEBAS.falso(p100Abierto(), 'con esSupervisor ya en true, no hay nada que ofrecer');
  } finally { p100Restaurar(prev); }

  const prev2 = p100Preparar({ rol:'medico', esServicioMedico:true });
  try {
    avanzarAlta();
    PRUEBAS.falso(p100Abierto(), 'y lo mismo con el servicio médico');
  } finally { p100Restaurar(prev2); }

  /* El discriminador del par de arriba: los MISMOS perfiles sin el flag SÍ abren. Sin esto, los
     dos casos anteriores podrían estar pasando porque la pantalla no abre nunca. */
  const prev3 = p100Preparar({ rol:'medico' });
  try {
    avanzarAlta();
    PRUEBAS.cierto(p100Abierto(), 'el mismo perfil SIN el flag sí abre · es el discriminador del par de arriba');
  } finally { p100Restaurar(prev3); }
});

PRUEBAS.caso('🔴 LA GUARDA !_complete · quien ya estaba registrado NO ve la pantalla', async () => {
  /* ⚠️ ESTE CASO ARRANCA LA APP DE NUEVO, DOS VECES, EN UN IFRAME ANIDADO. Es la única forma
     honesta de probarlo: `_complete` es `const` y se calcula UNA vez, al arrancar, así que dentro
     de la app viva no se puede cambiar. Las dos corridas son idénticas salvo en una cosa —si el
     perfil ya estaba completo AL ARRANCAR— y eso las convierte en su propio discriminador.

     ⚠️ SE LE CAMBIAN DOS COSAS AL HTML, Y NINGUNA ES LA LÓGICA QUE SE PRUEBA:
     · el endpoint apunta a una ruta local muerta en vez de a producción. Sin esto, arrancar con un
       perfil completo dispara `sincronizarRegistro()`, que escribiría una persona INVENTADA en la
       hoja `Registrados Fatiga` real. Una prueba no puede escribir en producción. La URL sigue
       siendo una cadena no vacía, que es lo único que mira la guarda de `avanzarAlta()`.
     · se apaga el registro del service worker: desde un documento escrito con `document.write` la
       URL relativa `./sw.js` no resuelve y deja una promesa rechazada sin dueño. */
  const fuente = await (await fetch('/index.html?p100=' + Date.now())).text();
  const html = fuente
    .replace(/const SHEETS_DASHBOARD_URL = '[^']*'/, "const SHEETS_DASHBOARD_URL = '/pruebas/_p100-endpoint-inexistente'")
    .replace("if ('serviceWorker' in navigator){", 'if (false){');
  PRUEBAS.cierto(html.indexOf('_p100-endpoint-inexistente') > 0 && html.indexOf('if (false){') > 0,
    '⚠️ guarda del propio caso · si el reemplazo no encontró su blanco, esta prueba arrancaría ' +
    'una app apuntando a PRODUCCIÓN. Antes de mirar nada, se comprueba que el parche entró');

  const cons = { items:{} };
  CONSENTIMIENTOS.forEach(c => { cons.items[c.k] = c.v; });
  const clvOfrecida = {}; clvOfrecida[dashNorm(P100_CED)] = true;
  const base = {};
  base[K_CONSENT] = JSON.stringify(cons);
  base[K_TEXTO] = '1';
  base['silva_fatiga_clave_ofrecida_v1'] = JSON.stringify(clvOfrecida);
  const perfil = Object.assign({}, P100_PERFIL, { rol:'supervisor', rolOrigen:'nomina' });

  /* ⚠️ SE ESPERA EL EVENTO `load`, NO UN `setTimeout`. Con `document.write` el analizador NO
     termina dentro de la misma llamada aunque se cierre el documento: medido acá mismo, justo
     después de `close()` el documento estaba en `readyState:"loading"`, había 2 <script> de 3 y
     `setProfile` todavía no existía — la primera versión de este caso fallaba por eso y no por el
     código. `load` no es un temporizador, así que la pestaña oculta no lo estrangula. Medido: 122 ms. */
  async function arrancar(ls){
    const marco = document.createElement('iframe');
    marco.style.cssText = 'position:absolute;left:-99999px;top:0;width:390px;height:844px;border:0';
    document.body.appendChild(marco);
    localStorage.clear();
    Object.keys(ls).forEach(k => localStorage.setItem(k, ls[k]));
    const listo = new Promise(res => marco.addEventListener('load', res, { once:true }));
    const d = marco.contentDocument;
    d.open(); d.write(html); d.close();
    await listo;
    return marco;
  }
  /* `_complete` es `const` de nivel superior: vive en el entorno léxico global, NO en `window`.
     `cw._complete` da `undefined` y la prueba pasaría por nada. Hay que evaluarlo adentro. */
  const leerComplete = cw => cw.eval('_complete');

  const prev = p100Guardar();
  let yaRegistrado = null, recienDadoDeAlta = null;
  try {
    /* 1 · YA REGISTRADO: el perfil está completo ANTES de arrancar, como en los teléfonos de
           Helitec. `_complete` sale en true y el paso del rol no puede correr. */
    const lsA = Object.assign({}, base); lsA[K_PROFILE] = JSON.stringify(perfil);
    const a = await arrancar(lsA);
    try {
      const w = a.contentWindow;
      yaRegistrado = { complete: leerComplete(w),
                       abierto: w.document.getElementById('rolOv').classList.contains('show') };
    } finally { a.remove(); }

    /* 2 · RECIÉN DADO DE ALTA: arranca SIN perfil, así que `_complete` es false; el alta escribe el
           perfil y vuelve a preguntar. Es la secuencia real, y el discriminador del caso 1. */
    const b = await arrancar(Object.assign({}, base));
    try {
      const w = b.contentWindow;
      w.setProfile(perfil);
      w.avanzarAlta();
      await p100Tick(12);
      recienDadoDeAlta = { complete: leerComplete(w),
                           abierto: w.document.getElementById('rolOv').classList.contains('show') };
    } finally { b.remove(); }
  } finally { p100Restaurar(prev); }

  PRUEBAS.cierto(yaRegistrado.complete,
    'precondición · arrancando con el perfil ya completo, `_complete` tiene que ser true');
  PRUEBAS.falso(yaRegistrado.abierto,
    '🔴 A QUIEN YA ESTABA REGISTRADO NO LE APARECE NADA · sin esta guarda, a las siete personas ' +
    'de Helitec les saldría un formulario de contraseña al abrir la app sin haber pedido nada');
  PRUEBAS.falso(recienDadoDeAlta.complete,
    'precondición del discriminador · arrancando sin perfil, `_complete` es false');
  PRUEBAS.cierto(recienDadoDeAlta.abierto,
    '🔴 EL DISCRIMINADOR · el mismo arranque, el mismo perfil y el mismo rol: lo único distinto es ' +
    'si ya estaba registrado. Si este no abriera, el de arriba estaría pasando por nada');
});

PRUEBAS.caso('🔴 activar guarda la credencial y el flag · y el rol lo AUTORIZA la contraseña', async () => {
  /* La regla del ADR 002 en una comprobación: la nómina propone, la contraseña autoriza. Se entra
     por la pantalla real (avanzarAlta), se escribe la contraseña y se mira qué quedó guardado. */
  const prev = p100Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  const fetchAntes = window.fetch;
  try {
    avanzarAlta();
    PRUEBAS.cierto(p100Abierto(), 'precondición · la pantalla tiene que estar abierta para poder escribir');
    document.getElementById('rolPass').value = P100_PASS;
    window.fetch = p100Stub({ ok:true });
    rolConfirmar(document.querySelector('#rolOv .save-btn'));
    await p100Tick(40);

    PRUEBAS.igual(P100_RED.llamadas.length, 1, 'sale UN pedido al servidor a validar la contraseña');
    const cuerpo = JSON.parse(P100_RED.llamadas[0].body || '{}');
    PRUEBAS.igual(cuerpo.action, 'supervisor',
      '⚠️ y es `action:supervisor`, la MISMA validación que ya usa el formulario de perfil · ' +
      'escribir una segunda regla de acceso acá sería tener dos que pueden discrepar');
    PRUEBAS.igual(cuerpo.pass, P100_PASS, 'con la contraseña que escribió la persona');

    PRUEBAS.falso(p100Abierto(), 'la pantalla se cierra al activar');
    PRUEBAS.cierto(!!(getProfile() || {}).esSupervisor, 'el perfil queda con el rol activado');
    const c = dashGetCreds() || {};
    PRUEBAS.igual(c.usuario, P100_EMP, 'y la credencial de empresa queda guardada, con la empresa como usuario');
    PRUEBAS.igual(c.pass, P100_PASS, 'y con la contraseña · es lo mismo que guarda el formulario de perfil');
    PRUEBAS.cierto(rolYaOfrecido(), 'y la cédula queda marcada: no se vuelve a interrumpir en cada arranque');
  } finally { window.fetch = fetchAntes; p100Restaurar(prev); }
});

PRUEBAS.caso('🔴 EL DISCRIMINADOR DEL ANTERIOR · una contraseña equivocada no activa NADA', async () => {
  /* Sin este caso, "activar siempre" pasaría por arreglo — y sería el agujero entero: la nómina
     pasaría a DAR acceso en vez de proponerlo, que es justo lo que el ADR prohíbe. */
  const prev = p100Preparar({ rol:'supervisor' });
  const fetchAntes = window.fetch;
  try {
    avanzarAlta();
    document.getElementById('rolPass').value = 'la-que-no-es';
    window.fetch = p100Stub({ ok:false, error:'Usuario o contraseña incorrecta' });
    rolConfirmar(document.querySelector('#rolOv .save-btn'));
    await p100Tick(40);

    PRUEBAS.cierto(p100Abierto(), 'la pantalla sigue abierta: no se puede seguir sin resolver esto');
    PRUEBAS.falso(!!(getProfile() || {}).esSupervisor, '🔴 el rol NO se activa · la nómina propone, la contraseña autoriza');
    PRUEBAS.falso(!!dashGetCreds(), 'y no queda ninguna credencial guardada');
    PRUEBAS.cierto((document.getElementById('rolErr').textContent || '').length > 0,
      'y se le dice qué pasó · un botón que no hace nada es peor que un error');
    PRUEBAS.falso(rolYaOfrecido(), 'y no se marca como ofrecida: fallar no puede cerrarle la puerta');
  } finally { window.fetch = fetchAntes; p100Restaurar(prev); }
});

PRUEBAS.caso('⚠️ si no se pudo verificar (sin red), tampoco se activa ni se encola', async () => {
  /* Activar sin verificar sería guardar una contraseña sin saber si sirve, y la persona se
     enteraría recién al abrir el panel y ver un error que no puede relacionar con esta pantalla.
     Y encolarla significaría dejarla escrita en claro en el dispositivo (misma decisión que Z4). */
  const prev = p100Preparar({ rol:'supervisor' });
  const fetchAntes = window.fetch;
  try {
    avanzarAlta();
    document.getElementById('rolPass').value = P100_PASS;
    window.fetch = p100Stub('falla');
    rolConfirmar(document.querySelector('#rolOv .save-btn'));
    await p100Tick(40);
    PRUEBAS.falso(!!(getProfile() || {}).esSupervisor, 'sin poder verificar, el rol no se activa');
    PRUEBAS.falso(!!dashGetCreds(), 'y la contraseña NO queda guardada en el dispositivo');
    PRUEBAS.cierto((document.getElementById('rolErr').textContent || '').indexOf(t('rol_of_sin_red')) >= 0,
      'y el mensaje dice que se puede hacer más tarde desde Más, no que la contraseña esté mal');
  } finally { window.fetch = fetchAntes; p100Restaurar(prev); }
});

PRUEBAS.caso('🔴 R4 · "Ahora no" no cierra la puerta: la entrada queda en Más para siempre', () => {
  /* El ADR 002 lo pide con todas las letras: "la nómina dice que gestiona, pero no tiene la
     contraseña → entra como empleado, y el ofrecimiento queda disponible en su perfil, no se
     pierde". Es el mismo agujero que Z4b tuvo que cerrar para la contraseña propia: ofrecer una
     sola vez convierte "más tarde" en "nunca más", y le pega justo a quien se quiere ayudar. */
  const prev = p100Preparar({ rol:'supervisor' });
  try {
    avanzarAlta();
    PRUEBAS.cierto(p100Abierto(), 'precondición · abierta');
    rolPosponer();
    PRUEBAS.falso(p100Abierto(), 'al posponer se cierra');
    PRUEBAS.cierto(rolYaOfrecido(), 'y la cédula queda marcada, para no interrumpir en cada arranque');

    avanzarAlta();
    PRUEBAS.falso(p100Abierto(), 'el arranque ya no vuelve a interrumpir · era el punto de la marca');

    miRolPintar();
    const btn = document.getElementById('miRolBtn');
    PRUEBAS.cierto(getComputedStyle(btn).display !== 'none',
      '🔴 PERO la fila de Más sigue visible · es la puerta que no se puede perder');
    PRUEBAS.cierto((document.getElementById('miRolDs').textContent || '').indexOf(t('rol_supervisor')) >= 0,
      'y dice qué rol le corresponde, no un "tienes algo pendiente" genérico');
    miRolTocar();
    PRUEBAS.cierto(p100Abierto(), '🔴 y desde ahí SÍ se vuelve a abrir, aunque ya lo haya pospuesto');
  } finally { p100Restaurar(prev); }
});

PRUEBAS.caso('🔴 el botón "atrás" del teléfono conoce esta pantalla', () => {
  /* ⚠️ ESTE CASO ENCONTRÓ UN DEFECTO REAL AL ESCRIBIRLO, y no es teórico: `silvaAtras()` tiene una
     lista EXPLÍCITA de overlays, así que uno nuevo que no se nombre ahí no existe para "atrás".
     La primera versión de P100 no lo nombraba: en un teléfono, la pantalla del ofrecimiento era un
     callejón sin salida — el toque se consumía y no pasaba nada. Es el mismo defecto que R1 tuvo
     que corregir para las cuatro pantallas del alta, y la misma forma de siempre: una lista a mano
     que alguien tiene que acordarse de actualizar. */
  const prev = p100Preparar({ rol:'supervisor' });
  try {
    avanzarAlta();
    PRUEBAS.cierto(p100Abierto(), 'precondición · abierta');
    PRUEBAS.cierto(silvaAtras(), '"atrás" tiene que decir que SÍ se ocupó de algo');
    PRUEBAS.falso(p100Abierto(), 'y la pantalla se cierra');
    miRolPintar();
    PRUEBAS.cierto(getComputedStyle(document.getElementById('miRolBtn')).display !== 'none',
      'y hace lo mismo que "Ahora no": pospone, sin cerrar la puerta de Más');
  } finally { p100Restaurar(prev); }
});

PRUEBAS.caso('⚠️ a un empleado común la fila de Más ni siquiera existe', () => {
  /* No es cosmético: anunciarle a todo el personal que hay un panel de empresa es exactamente el
     defecto que Q4d tuvo que arreglar con la pestaña "Dirección / HSEQ", que quedó visible para
     todos porque una línea no se actualizó. */
  const prev = p100Preparar({ rol:'empleado' });
  try {
    miRolPintar();
    PRUEBAS.igual(getComputedStyle(document.getElementById('miRolBtn')).display, 'none',
      'sin rol propuesto ni rol activo, la fila no se ve');
  } finally { p100Restaurar(prev); }

  const prev2 = p100Preparar({ rol:'supervisor' });
  try {
    miRolPintar();
    PRUEBAS.cierto(getComputedStyle(document.getElementById('miRolBtn')).display !== 'none',
      'el discriminador: con un rol propuesto sí se ve');
  } finally { p100Restaurar(prev2); }
});

PRUEBAS.caso('🔴 el servicio médico va a SU ranura, no a la de supervisor', async () => {
  /* Las dos credenciales se guardan aparte porque pueden ser distintas para la misma empresa
     (columna "Contraseña Médica" de `Accesos`). Meter la médica en la ranura de supervisor haría
     que el auto-login entrara con la vista equivocada — y esa vista es el cortafuegos K1b. */
  const prev = p100Preparar({ rol:'medico' });
  const fetchAntes = window.fetch;
  try {
    avanzarAlta();
    PRUEBAS.cierto(p100Abierto(), 'precondición · la pantalla abre también para el servicio médico');
    PRUEBAS.igual(document.getElementById('rolPassLbl').textContent, t('rol_of_pass_med'),
      '⚠️ y la etiqueta pide la contraseña MÉDICA · pedir "la de la empresa" a secas provoca el intento fallido');
    document.getElementById('rolPass').value = P100_PASS;
    window.fetch = p100Stub({ ok:true });
    rolConfirmar(document.querySelector('#rolOv .save-btn'));
    await p100Tick(40);
    PRUEBAS.cierto(!!(getProfile() || {}).esServicioMedico, 'queda como servicio médico');
    PRUEBAS.falso(!!(getProfile() || {}).esSupervisor, 'y NO como supervisor: son dos vistas distintas');
    PRUEBAS.igual((dashGetCredsMed() || {}).pass, P100_PASS, 'la contraseña va a la ranura médica');
    PRUEBAS.falso(!!dashGetCreds(), '🔴 y la ranura de supervisor queda intacta · es el discriminador');
  } finally { window.fetch = fetchAntes; p100Restaurar(prev); }
});

PRUEBAS.caso('⚠️ el ORIGEN cambia lo que dice la pantalla · nómina no es lo mismo que código', () => {
  /* "Tu empresa te registró como supervisor" es falso si lo que hubo fue un código que alguien le
     pasó: uno lo escribió RRHH en la hoja, el otro pudo llegar de cualquier lado. El servidor manda
     `rolOrigen` justo para esto y el cliente lo tiraba, igual que tiraba `rol` antes de P093. */
  const prev = p100Preparar({ rol:'supervisor', rolOrigen:'nomina' });
  let porNomina = '', porCodigo = '';
  try {
    avanzarAlta();
    porNomina = document.getElementById('rolTitulo').textContent || '';
  } finally { p100Restaurar(prev); }

  const prev2 = p100Preparar({ rol:'supervisor', rolOrigen:'codigo' });
  try {
    avanzarAlta();
    porCodigo = document.getElementById('rolTitulo').textContent || '';
  } finally { p100Restaurar(prev2); }

  PRUEBAS.igual(porNomina, t('rol_of_titulo', { rol: t('rol_supervisor') }), 'por nómina: "tu empresa te registró"');
  PRUEBAS.igual(porCodigo, t('rol_of_titulo_cod', { rol: t('rol_supervisor') }), 'por código: "el código que usaste corresponde a"');
  PRUEBAS.cierto(porNomina !== porCodigo,
    '⚠️ y tienen que ser DISTINTOS · si dieran lo mismo, `rolOrigen` estaría viajando para nada');
});

PRUEBAS.caso('⚠️ R5 · la guía por rol está, arranca CERRADA, y explica EL rol de esa persona', () => {
  /* Cerrada por defecto porque la pantalla ya tiene una decisión adentro; abierta la enterraría.
     Y por ROL porque lo que ve un supervisor y lo que ve el servicio médico son cortafuegos
     distintos: una guía genérica no ayuda a decidir si aceptar. */
  const vistos = {};
  ['supervisor', 'medico', 'hseq'].forEach(rol => {
    const prev = p100Preparar({ rol: rol });
    try {
      avanzarAlta();
      const det = document.querySelector('#rolGuia details');
      vistos[rol] = { hay: !!det, abierto: !!(det && det.open), txt: det ? (det.textContent || '') : '' };
    } finally { p100Restaurar(prev); }
  });
  PRUEBAS.cierto(vistos.supervisor.hay && vistos.medico.hay && vistos.hseq.hay,
    'los tres roles tienen su guía ⓘ (R5)');
  PRUEBAS.falso(vistos.supervisor.abierto || vistos.medico.abierto || vistos.hseq.abierto,
    'y las tres arrancan cerradas · la pantalla ya tiene una decisión adentro');
  PRUEBAS.cierto(vistos.supervisor.txt !== vistos.medico.txt && vistos.medico.txt !== vistos.hseq.txt,
    '⚠️ y las tres dicen cosas DISTINTAS · si fueran iguales, "guía por rol" sería sólo el nombre');
});

PRUEBAS.caso('⚠️ R4 · dice que reportar fatiga no tiene consecuencias, EN esta pantalla', () => {
  /* La cultura justa se ve, no se supone. Esta pantalla le pide a alguien que asuma un rol de
     supervisión: si no dice acá que eso no cambia nada sobre lo que reporta de su propia fatiga,
     la persona lo deduce sola — y lo deduce mal. */
  const prev = p100Preparar({ rol:'supervisor' });
  try {
    avanzarAlta();
    const caja = document.getElementById('rolJusta');
    const txt = (caja.textContent || '').toLowerCase();
    PRUEBAS.cierto(getComputedStyle(caja).display !== 'none', 'el bloque tiene que estar A LA VISTA, no plegado');
    PRUEBAS.cierto(txt.indexOf('no tiene consecuencias') >= 0,
      'y decirlo con esas palabras · es el principio que sostiene el programa entero');
    const lead = (document.getElementById('rolLead').textContent || '').toLowerCase();
    PRUEBAS.cierto(lead.indexOf('ahora no') >= 0 || lead.indexOf('más') >= 0,
      'y la bajada tiene que decir que puede decir que no ahora y activarlo después (ADR 002)');
  } finally { p100Restaurar(prev); }
});

PRUEBAS.caso('⚠️ R1/R2/R14 · español neutro, sin promesas médicas y sin términos de sector', () => {
  /* R1 ya se tuvo que corregir dos veces en este proyecto. R2: la app nunca declara "no apto".
     R14: arrancamos con pilotos pero el servicio va a plantas — "vuelo" o "tripulación" escritos a
     mano en una cadena rompen el día que esta pantalla la lea un jefe de turno de Cardón. */
  /* ⚠️ `I18N.es._` Y NO `I18N.es`. El diccionario se abre primero por IDIOMA y después por SECTOR
     (`_`, `aviacion`, `planta`, `campo`, `generico`) — R14. Escribirlo mal no da error: devuelve un
     objeto sin ninguna de las claves, y una prueba que recorre cero cadenas encuentra cero
     problemas. Es exactamente el "cero sin discriminador" que la R17 prohíbe, y por eso el
     `alMenos` de abajo va primero. */
  const dic = lang => (I18N[lang] && I18N[lang]._) || {};
  const claves = Object.keys(dic('es')).filter(k => k.indexOf('rol_of_') === 0 || k.indexOf('mi_rol') === 0);
  PRUEBAS.alMenos(claves.length, 15, 'precondición · las claves de P100 tienen que estar en el diccionario');

  /* ⚠️ SÓLO LAS FORMAS ACENTUADAS, y esta prueba se equivocó primero por no distinguirlas: con
     `toc[áa]` marcaba "toca", que es JUSTAMENTE la forma neutra correcta (tú tocas → toca). El
     voseo en texto se reconoce por el acento —tenés, podés, tocá, escribí—, así que buscar la
     vocal sin tilde convierte el detector en ruido. Y "ustedes" NO va acá: es la forma correcta
     para Venezuela; la que sobra es "vosotros". */
  const voseo = /\b(ten[é]s|pod[é]s|sab[é]s|quer[é]s|deb[é]s|hac[é]s|dec[í]s|ven[í]s|sos|and[á]|mir[á]|toc[á]|escrib[í]|eleg[í]|fijate|acordate|vos|vosotros)\b/i;
  const sector = /\b(vuelo|vuelos|piloto|pilotos|aeropuerto|tripulaci[óo]n|aeronave|despegue)\b/i;
  const medico = /\b(no apto|apto para volar|diagn[óo]stic)/i;
  const malVoseo = [], malSector = [], malMedico = [];
  ['es', 'en'].forEach(lang => {
    claves.forEach(k => {
      const v = dic(lang)[k];
      if (typeof v !== 'string') return;
      if (lang === 'es' && voseo.test(v)) malVoseo.push(k);
      if (sector.test(v)) malSector.push(lang + ':' + k);
      if (medico.test(v)) malMedico.push(lang + ':' + k);
    });
  });
  PRUEBAS.igual(malVoseo, [], 'R1 · ni una cadena en voseo: los usuarios son de Venezuela (' + malVoseo.join(', ') + ')');
  PRUEBAS.igual(malSector, [], 'R14 · ni un término de sector escrito a mano (' + malSector.join(', ') + ')');
  PRUEBAS.igual(malMedico, [], 'R2 · la app no declara aptitud ni promete nada clínico (' + malMedico.join(', ') + ')');

  const faltanEn = claves.filter(k => typeof dic('en')[k] !== 'string');
  PRUEBAS.igual(faltanEn, [], 'y todas tienen su traducción al inglés (' + faltanEn.join(', ') + ')');
});

PRUEBAS.caso('⚠️ R13 · se lee en los DOS temas, y sin un solo color a mano', () => {
  /* El modo oscuro de este archivo estuvo roto por ~400 colores fijos. Un `var()` que no resuelve
     computa a `inherit` SIN error en consola, así que esto no se descubre mirando: se mide. */
  const prev = p100Preparar({ rol:'supervisor' });
  const temaAntes = document.documentElement.getAttribute('data-tema');
  const flojos = [];
  try {
    avanzarAlta();
    /* ⚠️ GUARDA DE MEDIBILIDAD, y no es de adorno: se agregó porque al romper el enganche de
       `avanzarAlta()` a propósito, este caso siguió VERDE. Con el overlay cerrado, `offsetParent`
       es null, no se mide un solo elemento y una lista vacía de problemas parece un aprobado. */
    PRUEBAS.cierto(p100Abierto(), 'precondición · con la pantalla cerrada no se mide ni un color');
    /* ⚠️ HAY QUE MIRAR TAMBIÉN EL DEGRADADO, y me lo encontró esta misma prueba en su primera
       corrida. Los botones principales pintan el fondo con `linear-gradient`, así que
       `backgroundColor` da transparente: el detector subía hasta la tarjeta blanca, comparaba
       texto blanco contra blanco y reportaba 1:1 — un defecto que no existe. Un detector que
       miente es peor que no tenerlo, porque el error se propaga como si fuera un hallazgo. */
    const fondoDe = el => {
      let n = el;
      while (n && n !== document.documentElement){
        const cs = getComputedStyle(n);
        const grad = String(cs.backgroundImage || '').match(/rgba?\([^)]+\)/);
        if (grad) return grad[0];
        const c = cs.backgroundColor;
        const m = String(c).match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.5)) return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
    };
    ['claro', 'oscuro'].forEach(tema => {
      document.documentElement.setAttribute('data-tema', tema);
      void document.body.offsetWidth;
      ['#rolTitulo', '#rolLead', '#rolJusta', '#rolPassLbl', '#rolOv .save-btn', '#rolOv .cancel-btn',
       '#rolGuia summary', '#rolGuia .dh-body'].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el || !el.offsetParent) return;
        const c = CTX.contraste(getComputedStyle(el).color, fondoDe(el));
        if (c < 4.5) flojos.push(tema + ' ' + sel + ' = ' + c);
      });
    });
  } finally {
    document.documentElement.setAttribute('data-tema', temaAntes);
    void document.body.offsetWidth;
    p100Restaurar(prev);
  }
  PRUEBAS.igual(flojos, [],
    'todo el texto de la pantalla tiene que dar 4,5:1 o más en los dos temas (' + flojos.join(' · ') + ')');

  /* Que no haya colores escritos a mano en el marcado nuevo: los tokens existen justo para que el
     tema oscuro no dependa de acordarse. */
  const ov = document.getElementById('rolOv');
  const aMano = [...ov.querySelectorAll('[style]')]
    .map(e => e.getAttribute('style'))
    .filter(s => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(s));
  PRUEBAS.igual(aMano, [], 'R13 · ni un color literal en el marcado del overlay (' + aMano.join(' | ') + ')');
});

PRUEBAS.caso('⚠️ R12 · entra en 375, 768 y 1366 sin desbordar, y se puede tocar', () => {
  const prev = p100Preparar({ rol:'supervisor' });
  const problemas = [];
  try {
    avanzarAlta();
    // Misma guarda que el caso del contraste: sin la pantalla abierta, medir cero botones da verde.
    PRUEBAS.cierto(p100Abierto(), 'precondición · con la pantalla cerrada no se mide ni un botón');
    [[375, 667], [768, 1024], [1366, 768]].forEach(([w, h]) => {
      PRUEBAS.enVentana(w, h, (aw) => {
        const sheet = document.querySelector('#rolOv .sheet');
        if (sheet.scrollWidth > aw + 1) problemas.push(w + 'px: la hoja mide ' + sheet.scrollWidth + ' y no entra');
        [...document.querySelectorAll('#rolOv button')].forEach((b, i) => {
          const r = b.getBoundingClientRect();
          if (!r.width && !r.height) return;                 // no visible a este ancho
          /* El ojito de "ver contraseña" es un icono dentro del campo: se mide sólo su alto, como
             hace `cliente-toque.js` con los botones del encabezado. */
          const alto = Math.round(r.height);
          if (alto < 44) problemas.push(w + 'px: el botón ' + (i + 1) + ' mide ' + alto + ' px de alto');
          if (r.right > aw + 1) problemas.push(w + 'px: el botón ' + (i + 1) + ' se sale por la derecha');
        });
      });
    });
  } finally { p100Restaurar(prev); }
  PRUEBAS.igual(problemas, [],
    'con guantes y de noche, un objetivo de menos de 44 px es un toque que no entra (' + problemas.join(' · ') + ')');
});

PRUEBAS.caso('⚠️ CONTRATO · el servidor manda `rol` y `rolOrigen`, y el cliente los nombra a los dos', () => {
  /* R17 · el contrato entre los dos lados, no cada lado por separado. `nominaConfirmar()` arma el
     perfil con una lista CERRADA de campos: una clave que el servidor mande y el cliente no nombre
     se pierde en silencio. Es la forma exacta que ya se comió `duty` y `ausencias` (A4) y que se
     comió `rol` hasta P093. `rolOrigen` era el siguiente de la fila. */
  const cliente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  PRUEBAS.cierto(/rolOrigen:\s*q\.rolOrigen/.test(cliente),
    'el cliente tiene que NOMBRAR `rolOrigen` al armar el perfil, o el dato viaja y se tira');
  PRUEBAS.cierto(/rol:\s*q\.rol/.test(cliente), 'y `rol` también (P093)');
  if (!CTX.hayGs){ PRUEBAS.cierto(true, 'la mitad del servidor se saltea: no está servir-gs.py'); return; }
  PRUEBAS.cierto(/rolOrigen:\s*\(/.test(CTX.gs),
    '⚠️ y el servidor tiene que mandarlo de verdad · si lo saca, esta pantalla empieza a mentir ' +
    'sobre de dónde salió el rol y nadie se entera');
  PRUEBAS.cierto(/rol:\s*rolFinal/.test(CTX.gs), 'y el rol normalizado sigue viajando en el perfil del alta');
});

PRUEBAS.caso('cuando la nómina QUITA el rol, la fila de Más se repinta sola', () => {
  /* P101 baja el rol en el refresco y `miRolPintar()` sólo corría al ENTRAR a la pestaña Más: si
     la persona está parada ahí justo cuando llega la respuesta, la fila seguía ofreciéndole
     activar algo que la nómina acaba de sacarle. Una pantalla mintiendo, aunque sea por un rato.

     Se lee la función REAL con `.toString()` —no el archivo— porque es lo que el navegador está
     ejecutando de verdad: si alguien mueve el bloque a otro lado, esto sigue mirando el código
     vivo. Entrar por `tareasCargar()` exigiría montar la respuesta entera del servidor, y lo que
     hay que vigilar es sólo que no se olvide el repintado. */
  const fuente = String(tareasCargar);
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const i = sinComentarios.indexOf('rol_quitado');
  PRUEBAS.cierto(i > 0, 'el camino de P101 que quita el rol está en tareasCargar()');
  /* El rango arranca ANTES del índice: `rol_quitado` aparece DENTRO de `showToast(...)`, así que
     un `slice(i, …)` deja al propio showToast afuera y el discriminador de abajo daba falso. */
  const bloque = sinComentarios.slice(Math.max(0, i - 300), i + 400);
  PRUEBAS.cierto(bloque.indexOf('miRolPintar()') >= 0,
    'y repinta la fila de Más al quitarlo');
  /* Discriminadores: que el recorte de comentarios no se haya comido el código, y que la función
     que se repinta exista de verdad (un nombre mal escrito daría verde arriba). */
  PRUEBAS.cierto(bloque.indexOf('showToast') >= 0, 'el bloque analizado sigue teniendo código');
  PRUEBAS.igual(typeof miRolPintar, 'function', 'y miRolPintar existe');
});
