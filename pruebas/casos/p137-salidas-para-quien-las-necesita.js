PRUEBAS.grupo('P137 · las salidas que P132 cerró de más');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   P132 cerró tres puertas de la primera pantalla porque Franco tenía razón: «tiene muchas opciones
   para saltarse el código», en la pantalla que existe para pedirlo. Pero cerrarlas dejó SIN SALIDA
   a dos personas legítimas, y la auditoría de los seis prompts lo midió:

   · Quien NO está en la nómina —un ingreso nuevo que RRHH todavía no pegó en la hoja— llegaba al
     paso de la cédula, el servidor le decía que no figura, y sus opciones eran un texto de ayuda y
     nada más. El enlace «No estoy en la lista» seguía existiendo, pero sólo se mostraba en los
     pasos 'empresa' y 'persona', que quedaron INALCANZABLES cuando P132 cerró la lista de empresas.
   · Quien reinstala la app o cambia de teléfono llega a «Código de tu empresa» y nunca le dieron
     uno: se lo dan una vez, al entrar. Su enlace —«Ya me había registrado»— también salió de ahí.

   ⚠️ LA REGLA QUE RESUELVE LAS DOS COSAS SIN REABRIR LA QUEJA: la salida aparece cuando la persona
   DEMUESTRA que la necesita, no antes. Ninguna vuelve como control permanente de la primera
   pantalla — que sigue teniendo dos controles, no cinco.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p137Vis(id){
  const e = document.getElementById(id);
  return !!e && e.getBoundingClientRect().height > 0;
}
function p137Restaurar(previo){
  try { NOM.noFigura = false; NOM.codigo = ''; NOM.empresa = ''; } catch(e){}
  try { nominaCerrar(); recuperarCerrar(); } catch(e){}
  [...document.querySelectorAll('.overlay.show')].forEach(o => o.classList.remove('show'));
  try { syncScrollLock(); } catch(e){}
  try {
    localStorage.clear();
    Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
  } catch(e){}
}

/* ── LA PRIMERA PANTALLA NO SE ENSUCIA ─────────────────────────────────────────────────────── */

PRUEBAS.caso('🔒 la pantalla del código sigue teniendo DOS controles, no cinco', () => {
  /* La queja original de Franco. Si este caso se pone rojo, alguna salida volvió como control
     permanente y estamos otra vez donde empezamos. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    ALTA_EN_CURSO = true;
    document.getElementById('nominaOv').classList.add('show');
    nominaPasoCodigoInicial();
    /* ⚠️ QUÉ CAMBIÓ EN P166b (2026-09-10): Franco pidió una ✕ para volver al splash desde
       cualquier paso del alta («en todo el proceso no hay un botón de cerrar»). No es una salida
       del alta ni un atajo al padrón: cierra y vuelve a la portada (`altaAbandonar`). Se cuenta
       aparte para que lo que este caso vigila —que no vuelvan las salidas como controles
       permanentes— siga midiendo lo mismo. */
    const botones = [...document.querySelectorAll('#nominaOv button')].filter(e => e.getBoundingClientRect().height > 0);
    const cerrar = botones.filter(b => /altaAbandonar/.test(b.getAttribute('onclick') || '')).length;
    PRUEBAS.igual(cerrar, 1, 'la ✕ de cerrar, una sola');
    PRUEBAS.igual(botones.length - cerrar, 2,
      '🔒 «Continuar» y «Mi empresa no me dio código», nada más · antes eran cuatro');
    PRUEBAS.igual(p137Vis('nomCodSalidas'), false,
      '🔒 y la salida del que ya estaba registrado arranca CERRADA');
  } finally { p137Restaurar(previo); }
});

/* ── QUIEN YA ESTABA REGISTRADO Y REINSTALÓ ────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 quien dice que no tiene código recibe la salida de «Ya me había registrado»', () => {
  /* «No tengo código» son dos personas distintas: la que nunca lo tuvo (se le dice a quién
     pedírselo) y la que YA ESTABA registrada y reinstaló. A la segunda, P132 la dejó sin salida
     porque el reingreso de P121 se apoya en una llave que la reinstalación borra. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    document.getElementById('nominaOv').classList.add('show');
    nominaPasoCodigoInicial();
    PRUEBAS.igual(p137Vis('nomCodSalidas'), false, 'guarda: arranca cerrada');
    nominaSinCodigo();                                  // el camino real: el botón que ya existía
    PRUEBAS.igual(p137Vis('nomCodSalidas'), true,
      '⚠️ se abre al decir que no tiene código · antes quedaba sin ninguna salida');
    PRUEBAS.cierto(document.getElementById('nomCodErr').textContent.length > 20,
      'y sigue diciendo a quién pedírselo — la otra mitad de «no tengo código»');
    PRUEBAS.igual(NOM.paso, 'codigo',
      'sin irse de la pantalla · abrir la lista de empresas era la puerta que P132 cerró');
  } finally { p137Restaurar(previo); }
});

PRUEBAS.caso('⚠️ y la salida se cierra al volver a entrar al alta — no se hereda', () => {
  /* El discriminador de que la salida se GANA. Si quedara abierta de un intento anterior, sería
     otra vez un control permanente de la primera pantalla, disfrazado. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    document.getElementById('nominaOv').classList.add('show');
    nominaPasoCodigoInicial();
    nominaSinCodigo();
    PRUEBAS.igual(p137Vis('nomCodSalidas'), true, 'guarda: quedó abierta');
    nominaPasoCodigoInicial();                          // vuelve a la pantalla
    PRUEBAS.igual(p137Vis('nomCodSalidas'), false,
      '⚠️ cerrada otra vez · se gana tocando el botón, no se hereda');
  } finally { p137Restaurar(previo); }
});

/* ── QUIEN NO ESTÁ EN LA NÓMINA ────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 cuando el servidor dice que la cédula no figura, aparece «No estoy en la lista»', async () => {
  /* Se entra por `nominaCedulaBuscar()`, que es la función que recibe la respuesta del servidor:
     lo que estaba roto no era el enlace, era que ningún camino alcanzable lo mostraba. Se mockea
     sólo `fetchConReloj`, que es el borde real del sistema. */
  const previo = { todo: Object.assign({}, localStorage) };
  const prevFetch = fetchConReloj;
  try {
    localStorage.clear();
    NOM.empresa = 'Consorcio HELITEC'; NOM.codigo = 'ABC-1234'; NOM.noFigura = false;
    document.getElementById('nominaOv').classList.add('show');
    nominaPaso('cedsola');
    document.getElementById('nomCedulaSola').value = '99999999';
    PRUEBAS.igual(p137Vis('nomNoEstoy'), false, 'guarda: antes de preguntar, no se ofrece nada');
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:false }) });
    nominaCedulaBuscar();
    await new Promise(r => setTimeout(r, 60));
    /* ⚠️ QUÉ CAMBIÓ EN P165 (2026-09-10). Este caso afirmaba que, cuando el servidor decía que la
       cédula no figura, aparecía «No estoy en la lista». Recorrido contra producción, ese enlace
       abría el formulario libre y el servidor guardaba cualquier empresa. Decisión de Franco:
       todo por nómina (ADR 003). La salida de quien no figura sigue existiendo y es OTRA: el texto
       de «Mi cédula no aparece» (pídele a tu supervisor que te cargue), que se pinta acá mismo.
       Lo que P137 defendía —que quien demuestra que necesita una salida la tenga— sigue en pie;
       lo que cambió es que la salida no puede ser un alta sin nómina. */
    PRUEBAS.cierto(NOM.noFigura === true, 'el servidor dijo que no figura y el estado lo registra');
    PRUEBAS.igual(p137Vis('nomNoEstoy'), false,
      '⚠️ y AUN ASÍ «No estoy en la lista» no aparece · P165: ese enlace era un alta sin nómina');
    PRUEBAS.cierto(document.getElementById('nomCedErr').textContent.length > 20,
      'la salida es el motivo escrito: a quién pedirle que la cargue');
  } finally { fetchConReloj = prevFetch; p137Restaurar(previo); }
});

PRUEBAS.caso('🔒 pero un CÓDIGO inválido no abre esa puerta — el discriminador', async () => {
  /* Es la diferencia entre una salida y un atajo. `codigo_invalido` y `muchos_intentos` no dicen
     nada sobre si la persona está en la nómina: abrir ahí «No estoy en la lista» sería regalar el
     camino al formulario libre a quien simplemente erró el código. */
  const previo = { todo: Object.assign({}, localStorage) };
  const prevFetch = fetchConReloj;
  try {
    localStorage.clear();
    NOM.empresa = 'Consorcio HELITEC'; NOM.codigo = 'MAL'; NOM.noFigura = false;
    document.getElementById('nominaOv').classList.add('show');
    nominaPaso('cedsola');
    document.getElementById('nomCedulaSola').value = '99999999';
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'codigo_invalido' }) });
    nominaCedulaBuscar();
    await new Promise(r => setTimeout(r, 60));
    PRUEBAS.igual(p137Vis('nomNoEstoy'), false,
      '🔒 el código equivocado NO abre la salida del que no figura');
    PRUEBAS.igual(NOM.noFigura, false, 'y la marca no se enciende');
  } finally { fetchConReloj = prevFetch; p137Restaurar(previo); }
});

PRUEBAS.caso('⚠️ la marca no sobrevive a reabrir el alta', () => {
  /* `nominaAbrir()` la limpia: la salida se gana en cada intento. Sin esto, alguien que no figuró
     una vez tendría la puerta abierta para siempre en ese teléfono — incluido el siguiente que lo
     use, que es el caso del teléfono compartido del hangar. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    NOM.noFigura = true;
    nominaAbrir();
    PRUEBAS.igual(NOM.noFigura, false,
      '⚠️ se limpia al abrir · el teléfono se comparte y la salida es de quien la ganó');
  } finally { p137Restaurar(previo); }
});
