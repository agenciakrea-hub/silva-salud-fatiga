
PRUEBAS.grupo('T1 · listas largas: buscador, 3 y "ver todos"');

/* Monta una lista con `activos` personas que registraron y `grises` que no, pinta la sección en un
   contenedor propio y devuelve lo que haga falta medir. Deja DASH como estaba. */
function t1Montar(activos, grises, fn){
  /* ⚠️ `DASH` puede ser null: la suite corre con el panel cerrado, y estos casos no lo abren.
     Se arma uno propio y se devuelve EXACTAMENTE lo que había —incluido el null—, porque dejar un
     DASH inventado contamina a las pruebas que corren después: ya pasó, y el síntoma fue que
     fallaran casos de otro archivo que no tenían nada que ver. */
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  if (!DASH) DASH = { f:{}, _cfg:{} };
  const antes = { op: DASH.operacional, per: DASH.operacionalPeriodo, v: DASH.vista,
                  q: DASH._cicQ, todos: DASH._cicTodos, gr: DASH._cicGrises };
  const base = cicloDemo(), ops = [];
  for (let i = 0; i < activos; i++) base.forEach(o => ops.push(Object.assign({}, o, { persona: 'Activo ' + i })));
  for (let i = 0; i < grises; i++) ops.push(Object.assign({}, base[0], { persona: 'Gris ' + i, evento: '__ninguno__' }));
  DASH.operacional = ops;
  DASH.operacionalPeriodo = { dias: 30, puedeVerHistorico: true };
  DASH.vista = 'supervisor';
  DASH._cicQ = ''; DASH._cicTodos = false; DASH._cicGrises = false;

  const caja = document.createElement('div');
  caja.innerHTML = '<div class="dash-scroll"><section class="dash-sec" id="__t1s" data-tab="ciclo"></section></div>';
  document.body.appendChild(caja);
  try {
    const sec = caja.querySelector('#__t1s');
    sec.innerHTML = renderCicloOperativo();
    return fn(sec);
  } finally {
    caja.remove();
    if (previo){
      DASH.operacional = antes.op; DASH.operacionalPeriodo = antes.per; DASH.vista = antes.v;
      DASH._cicQ = antes.q; DASH._cicTodos = antes.todos; DASH._cicGrises = antes.gr;
    }
    DASH = previo;
  }
}

PRUEBAS.caso('⚠️ el corte NO toca los KPIs: los números son sobre la lista completa', () => {
  /* ESTE es el caso más importante del prompt. Los contadores de arriba son lo que el supervisor
     mira para decidir. Si el "mostrar 3" se aplicara antes del conteo, mentirían — y mentirían
     hacia abajo, que es la dirección peligrosa: dirían "1 pasado de tiempo" cuando hay nueve. */
  const r = t1Montar(9, 7, sec => ({
    tarjetas: sec.querySelectorAll('.cic-lista > *').length,
    kpis: [...sec.querySelectorAll('.cic-kpi')].map(e => e.textContent.trim()).join(' | ')
  }));
  PRUEBAS.comoMucho(r.tarjetas, 3, 'se dibujan 3 tarjetas como mucho');
  PRUEBAS.cierto(/9 en curso/.test(r.kpis),
    'pero el KPI cuenta las NUEVE, no las 3 dibujadas: ' + r.kpis);
  PRUEBAS.cierto(/7 sin iniciar/.test(r.kpis), 'y los grises también se cuentan enteros');
});

PRUEBAS.caso('⚠️ el contador de los grises queda a la vista aunque la lista esté plegada', () => {
  /* Los grises son el dato que el supervisor necesita: se esconden por largos, pero "3 de 47
     reportaron hoy" dice más que cualquier lista de 47 nombres, y es la pregunta que trae a
     alguien a esta pantalla. */
  const r = t1Montar(3, 44, sec => ({
    contador: (sec.querySelector('.cic-grises-n') || {}).textContent || '',
    nombresVisibles: sec.querySelectorAll('.cic-gris').length,
    hayBoton: !!sec.querySelector('.cic-grises-btn')
  }));
  PRUEBAS.cierto(/3/.test(r.contador) && /47/.test(r.contador),
    'el contador tiene que decir cuántos reportaron de cuántos: "' + r.contador + '"');
  PRUEBAS.igual(r.nombresVisibles, 0, 'y la lista de nombres arranca plegada');
  PRUEBAS.cierto(r.hayBoton, 'con su botón para desplegarla');
});

PRUEBAS.caso('"ver todos" declara CUÁNTOS son, no dice sólo "ver más"', () => {
  const r = t1Montar(9, 0, sec => ({
    tarjetas: sec.querySelectorAll('.cic-lista > *').length,
    txt: (sec.querySelector('.cic-mas') || {}).textContent || ''
  }));
  PRUEBAS.igual(r.tarjetas, 3, 'arranca con 3');
  PRUEBAS.cierto(/9/.test(r.txt), 'y el botón trae el total: "' + r.txt + '"');
});

PRUEBAS.caso('⚠️ el buscador encuentra sin acentos, en mayúsculas y en cualquier orden', () => {
  /* CASOS BORDE DEL PLAN. `buscarNorm` ya resolvía esto; lo que se comprueba es que el ciclo la use
     a ELLA y no una comparación propia más pobre. */
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  if (!DASH) DASH = { f:{}, _cfg:{} };
  const antes = { op: DASH.operacional, q: DASH._cicQ };
  const base = cicloDemo(), ops = [];
  ['Carla Núñez', 'Diego Páez', 'Ana Suárez'].forEach(n =>
    base.forEach(o => ops.push(Object.assign({}, o, { persona: n }))));
  DASH.operacional = ops;
  const caja = document.createElement('div');
  caja.innerHTML = '<section class="dash-sec" id="__t1b" data-tab="ciclo"></section>';
  document.body.appendChild(caja);
  const malos = [];
  try {
    const sec = caja.querySelector('#__t1b');
    [['NUNEZ', 1], ['paez diego', 1], ['suarez', 1], ['zzzz', 0]].forEach(par => {
      DASH._cicQ = par[0];
      sec.innerHTML = renderCicloOperativo();
      const n = sec.querySelectorAll('.cic-lista > *').length;
      if (n !== par[1]) malos.push('"' + par[0] + '": ' + n + ' en vez de ' + par[1]);
    });
  } finally {
    caja.remove();
    if (previo){ DASH.operacional = antes.op; DASH._cicQ = antes.q; }
    DASH = previo;
  }
  PRUEBAS.igual(malos, [], 'tiene que ignorar acentos y mayúsculas y aceptar el orden invertido');
});

PRUEBAS.caso('⚠️ el buscador NO usa dashNorm: eso arma los identificadores del CH', () => {
  /* `dashNorm` es lo que decide QUIÉN ES QUIÉN al cruzar personas contra el CH. Aflojarla para que
     el buscador sea más permisivo cambiaría la identidad de la gente, no la búsqueda. Por eso
     existe `buscarNorm` aparte, y por eso esto se vigila. */
  PRUEBAS.cierto(typeof buscarNorm === 'function', 'buscarNorm tiene que existir como función aparte');
  PRUEBAS.falso(buscarNorm('Pérez-López') === dashNorm('Pérez-López'),
    'y hacer algo distinto que dashNorm: si fueran iguales, una de las dos está de más — y la que ' +
    'se va a tocar el día que la búsqueda no encuentre algo es justo la que no hay que tocar');
});

PRUEBAS.caso('⚠️ los resultados viven aparte del buscador, para no destruir el campo', () => {
  /* `renderCicloOperativo` rehace todo el HTML y el reloj repinta la sección cada 60 s. Si la
     búsqueda rehiciera la sección, el `<input>` se destruiría en cada tecla: se perdería el foco y
     lo escrito, y sólo se podría escribir una letra por vez.
     La primera versión repintaba todo y le devolvía el foco al campo nuevo. Funcionaba, pero por
     RESCATE: cualquier repintado que se agregara después y se olvidara del rescate volvía a
     romperlo. Mejor que no haya nada que rescatar — el campo queda AFUERA de lo que se reemplaza. */
  const r = t1Montar(6, 3, sec => ({
    hayBuscador: !!sec.querySelector('#cicBuscar'),
    hayCuerpo: !!sec.querySelector('#cicCuerpo'),
    buscadorAfuera: !!sec.querySelector('#cicBuscar') &&
                    !sec.querySelector('#cicCuerpo').contains(sec.querySelector('#cicBuscar'))
  }));
  PRUEBAS.cierto(r.hayBuscador, 'con 9 personas tiene que dibujarse el buscador');
  PRUEBAS.cierto(r.hayCuerpo, 'y los resultados en su propio contenedor');
  PRUEBAS.cierto(r.buscadorAfuera,
    '⚠️ con el campo FUERA de ese contenedor: es lo que permite reemplazar los resultados sin tocarlo');
});

PRUEBAS.caso('⚠️ el reloj no repinta la sección mientras alguien está escribiendo', () => {
  /* El tic repinta cada 60 s. Sin esta guarda, a la persona se le borraría lo tipeado en medio de
     una palabra, sin ninguna causa visible. Se comprueba sobre el código: esperar 60 s en una
     prueba no es opción, y acá el foco real no se puede simular (ver LEEME). */
  PRUEBAS.cierto(/cicBuscar/.test(cicloTick.toString()),
    'el tic tiene que mirar si el buscador tiene el foco antes de repintar');
});

PRUEBAS.caso('con una sola persona no se dibuja buscador ni corte', () => {
  /* CASO BORDE DEL PLAN: empresa con 1 persona. Un buscador para buscar entre uno es ruido. */
  const r = t1Montar(1, 0, sec => ({
    tarjetas: sec.querySelectorAll('.cic-lista > *').length,
    buscador: !!sec.querySelector('#cicBuscar'),
    mas: !!sec.querySelector('.cic-mas')
  }));
  PRUEBAS.igual(r.tarjetas, 1, 'se ve su tarjeta');
  PRUEBAS.falso(r.buscador, 'sin buscador');
  PRUEBAS.falso(r.mas, 'y sin "ver todos"');
});

PRUEBAS.caso('con 500 personas dibuja 3, no 500', () => {
  /* CASO BORDE DEL PLAN. Lo que se vigila no es un número de milisegundos sino que el corte esté
     haciendo su trabajo, que es lo que mantiene la pantalla usable en una empresa grande. */
  const t0 = performance.now();
  const r = t1Montar(120, 380, sec => ({
    tarjetas: sec.querySelectorAll('.cic-lista > *').length,
    contador: (sec.querySelector('.cic-grises-n') || {}).textContent || ''
  }));
  const ms = performance.now() - t0;
  PRUEBAS.igual(r.tarjetas, 3, 'con 500 personas se dibujan 3 tarjetas');
  PRUEBAS.cierto(/500/.test(r.contador), 'y el contador declara el total: "' + r.contador + '"');
  PRUEBAS.comoMucho(ms, 3000, 'y no puede tardar segundos (' + Math.round(ms) + ' ms)');
});

PRUEBAS.caso('⚠️ los textos del buscador pasan por t(), en los dos idiomas', () => {
  /* R14. El buscador de Aptitud tenía su placeholder escrito a mano en español — el propio plan
     pedía copiar ese patrón "sin arrastrar su deuda", así que se arregló ahí también en vez de
     copiarla. */
  const faltan = [];
  ['bus_ph','bus_lbl','bus_limpiar','bus_sin','bus_sin_h','lst_ver_todos','lst_ver_menos',
   'lst_reportaron','lst_ver_sin','lst_ocultar_sin'].forEach(k => {
    const v = t(k); if (!v || v === k) faltan.push(k);
  });
  PRUEBAS.igual(faltan, [], 'toda clave del buscador tiene que resolver a texto de verdad');
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  PRUEBAS.falso(/placeholder="Buscar por nombre o departamento/.test(js),
    'y no puede quedar ningún placeholder escrito a mano en español (era la deuda de Aptitud)');
});
