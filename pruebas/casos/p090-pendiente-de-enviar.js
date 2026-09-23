PRUEBAS.grupo('P090 · el punto de «pendiente de enviar» (R7) · lo que el servidor todavía no confirmó');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   POR QUÉ EXISTE ESTE ARCHIVO

   Lo escribió el hilo principal DESPUÉS de que la revisión adversarial encontrara que
   `cmesPendientes()` marcaba **todos** los días con actividad local como «pendiente de enviar»,
   incluso con señal perfecta y el servidor ya confirmando. Los 15 archivos de P090 estaban en verde
   y ninguno tocaba esa función: un grep de `cmesPendientes` sobre `pruebas/casos/` daba cero.

   EL DEFECTO, en una línea: comparaba por `o.id`, y **ningún lado guarda ese campo**.
     · `cicloMioGuardar` (index.html) escribe `{ evento, iso, test, resultado }`.
     · `leerOperacional` (el .gs) devuelve `{ fecha, hora, iso, persona, empresa, departamento,
       cargo, evento, test, resultado, plan }`.
     · El `id` —`op_<persona>_<fecha>_<evento>`— sólo existe dentro del query string de
       `enviarOperacional`, o sea que viaja y no vuelve.
   Con eso el mapa del servidor quedaba vacío y la guarda `(o.id && srv[o.id])` era `undefined` para
   todo evento local. La marca que existe para avisar «esto todavía no salió» estaba encendida justo
   cuando sí había salido, así que el día que de verdad hubiera cola nadie la habría distinguido.

   POR QUÉ LA IDENTIDAD ES `día de la operación + evento` Y NO OTRA COSA
   Es **la misma que usa el upsert del servidor**: `enviarOperacional` arma
   `id: 'op_' + idPersonaClave(p) + '_' + fecha + '_' + campo`, o sea una fila por persona/día/evento.
   Elegir esa identidad y no inventar una nueva es lo que evita que escritor y lector vuelvan a
   derivar distinto — el error más repetido de este proyecto.

   ⚠️ Y NO SE PUEDE COMPARAR POR `evento|iso`, que era el arreglo obvio: `enviarOperacional` llama a
   `cicloMioGuardar` con un `new Date()` y arma el envío con **otro**, así que los dos instantes
   difieren en milisegundos y no coincidirían nunca. El caso 4 lo mide.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P090P_PER = 'Persona De Prueba';

/* Escribe por el camino REAL (`cicloMioGuardar`, la misma función que llama `enviarOperacional`),
   nunca armando el array a mano: lo que se prueba es que el lector entienda lo que el escritor
   produce, no que entienda un literal escrito para él. */
function p090pSembrarLocal(eventos){
  eventos.forEach(function(e){ cicloMioGuardar(e); });
  return cicloMioLocal();
}

/* La forma EXACTA que `leerOperacional` le devuelve al cliente y que `misSincronizar` guarda tal
   cual en `K_CICLO_SRV`. Sin `id` — que es justo lo que el defecto daba por sentado. */
function p090pComoServidor(locales, iso){
  return locales.map(function(o){
    const i = iso ? iso(o.iso) : o.iso;
    return { fecha: i.slice(0, 10), hora: i.slice(11, 16), iso: i, persona: P090P_PER,
             empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto',
             evento: o.evento, test: '', resultado: null, plan: '' };
  });
}

function p090pEntorno(fn){
  const prev = Object.assign({}, localStorage);
  try {
    CTX.resetear({ cargo: 'Piloto', esPiloto: true });
    return fn();
  } finally {
    /* R18 · la suite comparte el localStorage con la app: lo que quede escrito acá es la
       precondición de la prueba siguiente. */
    try { localStorage.clear(); Object.keys(prev).forEach(function(k){ localStorage.setItem(k, prev[k]); }); } catch(e){}
    try { renderSections(); } catch(e){}
  }
}

PRUEBAS.caso('🔴 P090 · con el servidor al día NO queda ningún día marcado «pendiente de enviar» (antes salían TODOS)', () => {
  p090pEntorno(function(){
    const local = p090pSembrarLocal(['salida_casa', 'llegada_aero']);
    PRUEBAS.igual(local.length, 2, 'guarda: los dos eventos se escribieron por el camino real · sin esto lo de abajo no mide nada');
    PRUEBAS.falso('id' in local[0],
      '⚠️ y el escritor local NO produce `id` · es el hecho que hacía fallar la comparación vieja, y queda anclado acá');

    localStorage.setItem(K_CICLO_SRV, JSON.stringify(p090pComoServidor(local)));
    const srv = cicloMioServidor();
    PRUEBAS.igual(srv.length, 2, 'guarda: el servidor devolvió los dos');
    PRUEBAS.falso('id' in srv[0],
      '⚠️ y el servidor TAMPOCO manda `id` (`leerOperacional` devuelve fecha/hora/iso/persona/…) · las dos mitades del defecto, juntas');

    PRUEBAS.igual(cmesPendientes(), {},
      '🔴 con los dos confirmados no hay NADA pendiente · antes acá salía el día de hoy marcado, con señal perfecta');
  });
});

PRUEBAS.caso('🔴 DISCRIMINADOR · un evento que el servidor todavía no confirmó SÍ marca su día', () => {
  p090pEntorno(function(){
    const local = p090pSembrarLocal(['salida_casa', 'llegada_aero']);
    const comoSrv = p090pComoServidor(local);

    /* Sólo el primero llegó: es lo que pasa cuando la cola se corta en el medio. */
    localStorage.setItem(K_CICLO_SRV, JSON.stringify([comoSrv[0]]));
    const unDia = cmesPendientes();
    PRUEBAS.igual(Object.keys(unDia), [todayStr()],
      '🔴 el día del evento que falta queda marcado · si esto no distinguiera, la marca no serviría para nada');

    /* Y nada llegó: el caso de quien registró sin señal. */
    localStorage.setItem(K_CICLO_SRV, '[]');
    PRUEBAS.igual(Object.keys(cmesPendientes()), [todayStr()], 'sin nada confirmado, el día también queda marcado');

    /* El discriminador del discriminador: con los dos confirmados vuelve a cero. La prueba
       distingue los dos estados, no marca siempre ni nunca. */
    localStorage.setItem(K_CICLO_SRV, JSON.stringify(comoSrv));
    PRUEBAS.igual(cmesPendientes(), {}, 'y con los dos confirmados vuelve a cero · la función distingue, no contesta siempre lo mismo');
  });
});

PRUEBAS.caso('⚠️ P090 · el instante NO puede ser la identidad: el local y el enviado difieren en milisegundos', () => {
  p090pEntorno(function(){
    const local = p090pSembrarLocal(['salida_casa']);
    /* `enviarOperacional` llama a `cicloMioGuardar` con un `new Date()` y arma el envío con otro:
       en una máquina cargada eso son decenas de milisegundos. Se simula con 37 ms. */
    localStorage.setItem(K_CICLO_SRV, JSON.stringify(p090pComoServidor(local, function(iso){
      return new Date(Date.parse(iso) + 37).toISOString();
    })));
    const srv = cicloMioServidor();
    PRUEBAS.falso(srv[0].iso === local[0].iso,
      'guarda: los dos instantes son distintos, que es lo que pasa de verdad · sin esta diferencia el caso no mediría nada');
    PRUEBAS.igual(cmesPendientes(), {},
      '⚠️ y aun así NO queda pendiente · con `evento|iso` como identidad, esto marcaría todo: por eso la clave es día+evento');
  });
});

PRUEBAS.caso('⚠️ P090 · un evento con fecha ilegible no inventa un día pendiente', () => {
  p090pEntorno(function(){
    p090pSembrarLocal(['salida_casa']);
    const lista = cicloMioLocal();
    lista.push({ evento: 'llegada_aero', iso: '9/12/2026 18:52:00', test: '', resultado: null });
    localStorage.setItem(K_CICLO_MIO, JSON.stringify(lista));
    localStorage.setItem(K_CICLO_SRV, '[]');

    const dias = Object.keys(cmesPendientes());
    PRUEBAS.igual(dias, [todayStr()],
      '⚠️ sólo el día del evento legible · el ilegible no aporta una casilla, y los ilegibles ya se cuentan aparte en el pie');
    PRUEBAS.igual(dias.filter(function(d){ return !/^\d{4}-\d{2}-\d{2}$/.test(d); }), [],
      'DISCRIMINADOR · ninguna clave con forma rara (NaN, undefined): `Date.parse` de esa cadena SÍ da un número, así que `isFinite` no habría alcanzado');
  });
});

PRUEBAS.caso('⚠️ P090 · la marca llega hasta la casilla y hasta su nombre accesible', () => {
  p090pEntorno(function(){
    const local = p090pSembrarLocal(['salida_casa']);
    localStorage.setItem(K_CICLO_SRV, '[]');
    localStorage.setItem(K_CICLO_SRV_PER, JSON.stringify({ dias: 30, desde: null, hasta: null, ts: Date.now() }));

    const cont = document.createElement('div');
    cont.innerHTML = cmesBloqueHtml('mio', cicloYo(), todayStr().slice(0, 7));
    const celda = cont.querySelector('.cmes-d[data-f="' + todayStr() + '"]');
    PRUEBAS.cierto(!!celda, 'guarda: la casilla de hoy está en la grilla');
    PRUEBAS.cierto(celda && celda.classList.contains('cmes-pend'),
      '⚠️ lleva la clase del punto · el color solo no alcanza, pero el punto sin nombre tampoco');
    PRUEBAS.cierto((celda.getAttribute('aria-label') || '').indexOf(t('cmes_pendiente')) >= 0,
      '⚠️ y el nombre accesible lo DICE («' + t('cmes_pendiente') + '») · el punto mide 5 px y es aria-hidden');

    /* DISCRIMINADOR · con el servidor al día, ni la clase ni la cadena. */
    localStorage.setItem(K_CICLO_SRV, JSON.stringify(p090pComoServidor(local)));
    const cont2 = document.createElement('div');
    cont2.innerHTML = cmesBloqueHtml('mio', cicloYo(), todayStr().slice(0, 7));
    const celda2 = cont2.querySelector('.cmes-d[data-f="' + todayStr() + '"]');
    PRUEBAS.falso(celda2.classList.contains('cmes-pend'),
      'DISCRIMINADOR · confirmado, la casilla no lleva el punto');
    PRUEBAS.igual((celda2.getAttribute('aria-label') || '').indexOf(t('cmes_pendiente')), -1,
      'ni su nombre accesible lo menciona');
  });
});
