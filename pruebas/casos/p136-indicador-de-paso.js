PRUEBAS.grupo('P136 · el indicador de paso');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Lo pidió la segunda opinión que trajo Franco: «un asistente paso a paso con indicadores visuales
   claros, para que el usuario no sienta que está rellenando un formulario infinito».

   ⚠️ QUÉ CUENTA COMO PASO — la pregunta que había que contestar antes de escribir nada, y se
   contestó MIDIENDO el recorrido real: SEIS pantallas obligatorias. No cuentan el splash ni las
   cinco láminas del carrusel (ya tiene su propio indicador de cinco puntitos y su «Saltar»), ni
   los dos ofrecimientos del final (rol y contraseña propia), porque no le aparecen a todo el
   mundo. Un total que a veces se cumple y a veces no es peor que ninguno.

   ⚠️ Y SÓLO DURANTE EL ALTA: cuatro de esas seis pantallas también se abren fuera del recorrido
   —el consentimiento cuando sube de versión, el tamaño de letra desde Más, los datos desde «Editar
   mis datos»— y ahí un «paso 5 de 6» sería mentira.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p136Ind(sel){
  const e = document.querySelector(sel + ' > .paso-ind');
  return e ? e.textContent.trim() : null;
}
function p136Restaurar(previo){
  try { ALTA_EN_CURSO = false; } catch(e){}
  try { closeSetup(); nominaCerrar(); } catch(e){}
  ['consent','textoOverlay'].forEach(id => {
    const e = document.getElementById(id); if (e) e.classList.remove('show');
  });
  try { syncScrollLock(); } catch(e){}
  try {
    localStorage.clear();
    Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
  } catch(e){}
}

PRUEBAS.caso('🔴 los tres pasos de identificación se numeran sobre SEIS', () => {
  /* Se entra por `nominaAbrir()`, que es lo que corre de verdad, no por `pasoPintar()` suelto:
     lo que se rompe en la vida real no es la función, es que el paso no esté enganchado. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    /* ⚠️ NO se llama a `nominaAbrir()`: esa función hace `navPush()` y `nominaCerrar()` NO consume
       la entrada (está documentado en el comentario de `navConsumir`, y es deuda conocida). Con
       varias llamadas seguidas la pila crece hasta que la pestaña termina navegando sola en medio
       de la corrida — me pasó y tardé en verlo. Se entra por `nominaPaso()`, que es exactamente
       la función que pinta el indicador: lo que se está midiendo no cambia. */
    ALTA_EN_CURSO = true;
    document.getElementById('nominaOv').classList.add('show');
    nominaPaso('codigo');
    PRUEBAS.igual(p136Ind('#nominaOv .sheet'), t('paso_fase_ident') + ' · ' + t('paso_de', { n:1, total:6 }),
      '⚠️ el primer paso se anuncia · antes no había forma de saber cuánto faltaba');
    nominaPaso('cedsola');
    PRUEBAS.igual(p136Ind('#nominaOv .sheet'), t('paso_fase_ident') + ' · ' + t('paso_de', { n:2, total:6 }),
      'y avanza con el recorrido');
    nominaPaso('confirmar');
    PRUEBAS.igual(p136Ind('#nominaOv .sheet'), t('paso_fase_ident') + ' · ' + t('paso_de', { n:3, total:6 }),
      'hasta el tercero');
  } finally { p136Restaurar(previo); }
});

PRUEBAS.caso('🔴 el formulario de datos es el paso 4', () => {
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Consorcio HELITEC']; SETUP_LISTS_LOADED = true;
    ALTA_EN_CURSO = true;
    setProfile({ nombre:'Ana Suárez', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Operaciones', cargo:'Piloto', sexo:'Femenino', edad:'34',
                 telefono:'04121112233', email:'ana@ejemplo.com' });
    openSetup(false);
    PRUEBAS.igual(p136Ind('#setup .sheet'), t('paso_fase_datos') + ' · ' + t('paso_de', { n:4, total:6 }),
      '⚠️ y cambia de fase: ya no es identificarse, son sus datos');
  } finally { p136Restaurar(previo); }
});

PRUEBAS.caso('🔒 «Editar mis datos» NO muestra indicador — ahí no hay recorrido', () => {
  /* El discriminador de la marca. Sin ella, la misma pantalla diría «paso 4 de 6» a alguien que
     entró desde Más a corregir su teléfono, prometiéndole cinco pantallas que no existen. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Consorcio HELITEC']; SETUP_LISTS_LOADED = true;
    ALTA_EN_CURSO = true;                       // aunque venga encendida del alta anterior
    setProfile({ nombre:'Ana', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Ops', cargo:'Piloto', sexo:'Femenino', edad:'34',
                 telefono:'04121112233', email:'a@a.com' });
    openSetup(true);                            // el camino real de «Editar mis datos»
    PRUEBAS.igual(p136Ind('#setup .sheet'), null,
      '🔒 sin indicador al editar · el número prometería un recorrido que no hay');
  } finally { p136Restaurar(previo); }
});

PRUEBAS.caso('🔒 y con el alta terminada tampoco aparece', () => {
  /* `avanzarAlta()` apaga la marca justo antes de revelar la app. Si quedara encendida, el
     indicador volvería la próxima vez que se abra el consentimiento o el tamaño de letra. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    ALTA_EN_CURSO = true;
    document.getElementById('nominaOv').classList.add('show');
    nominaPaso('codigo');
    PRUEBAS.cierto(!!p136Ind('#nominaOv .sheet'), 'guarda: durante el alta SÍ está');
    ALTA_EN_CURSO = false;
    nominaPaso('cedsola');
    PRUEBAS.igual(p136Ind('#nominaOv .sheet'), null,
      '🔒 apagada la marca, el indicador se saca · no queda pegado de un alta anterior');
  } finally { p136Restaurar(previo); }
});

/* ── EL ARREGLO DE LA PANTALLA VACÍA QUE DEJÓ P122 ─────────────────────────────────────────── */

PRUEBAS.caso('🔴 con la nómina completa, el paso 4 CONFIRMA en vez de quedar vacío', () => {
  /* ⚠️ ESTO LO INTRODUJO P122 Y SE ENCONTRÓ MIRANDO, no midiendo. Si la nómina trae los nueve
     campos, el modo «faltantes» los esconde a los nueve: quedaba un panel que decía «Falta muy
     poco · Sólo necesitamos esto para terminar:» y abajo NADA, con un botón «Guardar y continuar»
     flotando. Parecía rota, y encima mentía.
     La pantalla no se puede saltear —`saveProfile()` es el único camino que escribe la fila en
     `Registrados Fatiga`— así que en vez de esconderla, cambia de rol: pasa a ser la confirmación
     de lo que la empresa cargó. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Consorcio HELITEC']; SETUP_LISTS_LOADED = true;
    ALTA_EN_CURSO = true;
    setProfile({ nombre:'Ana Suárez', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Operaciones', cargo:'Piloto', sexo:'Femenino', edad:'34',
                 telefono:'04121112233', email:'ana@ejemplo.com' });
    openSetup(false);
    PRUEBAS.igual(setupCamposFaltantes().length, 0, 'guarda: efectivamente no falta nada');
    const caja = document.getElementById('setupResumen');
    PRUEBAS.cierto(!!caja, '⚠️ hay un resumen · antes la pantalla quedaba literalmente vacía');
    PRUEBAS.alMenos(caja ? caja.querySelectorAll('div').length : 0, 5,
      '⚠️ con sus datos a la vista para confirmar');
    PRUEBAS.cierto((caja ? caja.textContent : '').indexOf('Ana Suárez') >= 0,
      'y el nombre es el suyo, no un texto de relleno');
    PRUEBAS.igual(document.getElementById('setupTitle').textContent, t('setup_titulo_confirmar'),
      '⚠️ y el título dice CONFIRMA, no «falta muy poco» · decir que falta algo cuando no falta nada es mentir');
  } finally { p136Restaurar(previo); }
});

PRUEBAS.caso('⚠️ pero si falta algo, sigue siendo formulario y NO hay resumen — el discriminador', () => {
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Consorcio HELITEC']; SETUP_LISTS_LOADED = true;
    ALTA_EN_CURSO = true;
    setProfile({ nombre:'Ana Suárez', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Operaciones', cargo:'Piloto', sexo:'Femenino', edad:'34' });
    openSetup(false);
    PRUEBAS.igual(!!document.getElementById('setupResumen'), false,
      '⚠️ sin resumen cuando hay algo que pedir · si no, se confirmarían datos que no están');
    PRUEBAS.igual(document.getElementById('setupTitle').textContent, t('setup_titulo_faltantes'),
      'y el título vuelve a ser el de «falta muy poco»');
  } finally { p136Restaurar(previo); }
});

PRUEBAS.caso('⚠️ el resumen se arma con nodos, no con innerHTML · entran datos de persona', () => {
  /* Este archivo tiene la regla de no escribir sin `esc()`. El resumen pinta nombre, cargo y
     correo: si se armara con `innerHTML`, un nombre con `<` en la nómina rompería la pantalla. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Consorcio HELITEC']; SETUP_LISTS_LOADED = true;
    ALTA_EN_CURSO = true;
    setProfile({ nombre:'Ana <b>Suárez</b>', cedula:'12345678', empresa:'Consorcio HELITEC',
                 departamento:'Operaciones', cargo:'Piloto', sexo:'Femenino', edad:'34',
                 telefono:'04121112233', email:'a@a.com' });
    openSetup(false);
    const caja = document.getElementById('setupResumen');
    PRUEBAS.cierto(!!caja, 'guarda: hay resumen');
    PRUEBAS.igual(caja ? caja.querySelectorAll('b:not(:first-child)').length >= 0 : false, true, 'guarda');
    PRUEBAS.cierto((caja ? caja.textContent : '').indexOf('<b>') >= 0,
      '⚠️ el marcado del nombre se ve como TEXTO · si se interpretara, sería una inyección');
  } finally { p136Restaurar(previo); }
});


PRUEBAS.caso('⚠️ `nominaAbrir()` es quien enciende la marca del recorrido', () => {
  /* Lo único que los casos de arriba no cubren, porque entran por `nominaPaso()` para no empujar
     historial. Acá se llama a la función real UNA vez: si dejara de encender la marca, el
     indicador no aparecería en ninguna de las seis pantallas y todos los casos de arriba —que la
     encienden a mano— seguirían en verde. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    localStorage.clear();
    ALTA_EN_CURSO = false;
    nominaAbrir();
    PRUEBAS.igual(ALTA_EN_CURSO, true,
      '⚠️ abrir el alta enciende el recorrido · sin esto el indicador no se pinta en ningún paso');
  } finally { p136Restaurar(previo); }
});


/* ── R12 · LO QUE EL AUDITOR GENÉRICO NO VE ────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 el resumen no CORTA ningún dato, a ningún ancho', () => {
  /* ⚠️ ESTE DEFECTO PASÓ POR DEBAJO DE 120 CORRIDAS DEL AUDITOR, y vale entender por qué: el
     auditor mide si un elemento desborda su CONTENEDOR, y las filas del resumen no desbordaban —
     lo que desbordaba era el contenido DENTRO de cada fila. Es otra medición
     (`scrollWidth > clientWidth`), y sin ella el correo largo quedaba cortado a 320 y 375 px,
     justo en la pantalla donde la persona tiene que CONFIRMAR sus datos.
     Se mide con el correo y el departamento más largos que hay en producción, no con datos cortos
     de prueba: un dato corto entra en cualquier ancho y el caso pasaría sin medir nada. */
  const previo = { todo: Object.assign({}, localStorage) };
  const anchos = PRUEBAS.VENTANAS ? PRUEBAS.VENTANAS.map(v => v.w) : [320, 375, 768, 1366];
  const cortadas = [];
  try {
    localStorage.clear();
    SETUP_LISTS.empresas = ['Consorcio HELITEC']; SETUP_LISTS_LOADED = true;
    ALTA_EN_CURSO = true;
    setProfile({ nombre:'Fernando José Guerra Pinto', cedula:'V-14567832',
                 empresa:'Consorcio HELITEC', departamento:'Operaciones Aéreas', cargo:'Piloto',
                 sexo:'Masculino', edad:'41', telefono:'0412-1112233',
                 email:'fernando@consorciohelitec.com' });
    openSetup(false);
    const caja = document.getElementById('setupResumen');
    PRUEBAS.cierto(!!caja, 'guarda: hay resumen · si no, este caso no mide nada');
    PRUEBAS.alMenos(caja ? caja.querySelectorAll('div').length : 0, 5, 'guarda: con sus filas');
    (PRUEBAS.VENTANAS || [{w:320,h:800},{w:375,h:812},{w:768,h:1024},{w:1366,h:768}]).forEach(v => {
      PRUEBAS.enVentana(v.w, v.h, () => {
        const c = document.getElementById('setupResumen');
        if (!c) return;
        [...c.querySelectorAll('div')].forEach(fila => {
          if (fila.scrollWidth > fila.clientWidth + 1){
            cortadas.push(v.w + 'px: «' + fila.textContent.trim().slice(0, 26) + '»');
          }
        });
      });
    });
    PRUEBAS.igual(cortadas, [],
      '⚠️ ningún dato cortado · el correo largo se cortaba a 320 y 375 px — ' + cortadas.join(' · '));
  } finally {
    try { closeSetup(); ALTA_EN_CURSO = false; } catch(e){}
    try {
      localStorage.clear();
      Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
    } catch(e){}
  }
});
