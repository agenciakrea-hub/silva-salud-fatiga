/* ── P209 · lo que la persona ya escribió no se pierde ──────────────────────────────────────────
   (2026-09-29 · los 4 hallazgos de la dimensión `offline` de la auditoría P205)

   Las cinco colas de la app tenían que comportarse igual y no lo hacían. Cuatro defectos con la
   misma consecuencia: algo que alguien escribió —una restricción, una determinación médica, un
   turno, un PVT— desaparecía sin que nadie se enterara.

   ⚠️ R18 · todo lo que dispara una promesa restaura en el `.finally()` DE ESA PROMESA, y toda
   medición deja el `localStorage` como lo encontró. */

PRUEBAS.grupo('P209 · lo que ya se escribió no se pierde');

function p209Limpio(fn) {
  /* Snapshot y restauración del almacén completo: estos casos escriben en cinco claves distintas. */
  const prevLS = {}; try { Object.keys(localStorage).forEach(k => { prevLS[k] = localStorage.getItem(k); }); } catch (e) {}
  const prevDash = DASH;
  /* ⚠️ R18 · `empFlush` y `colaReintentar` son SÍNCRONOS pero disparan promesas que siguen
     escribiendo en `localStorage` (`empColaSave` desde el `.then`, `empFallo` desde el `.catch`).
     Restaurando en el mismo tick, esas escrituras caen DESPUÉS de la restauración y quedan como
     precondición de la corrida siguiente — medido: tres turnos falsos en `K_EMP_COLA` un tick más
     tarde. Por eso la restauración de un caso síncrono se difiere un tick. Es la segunda causa que
     R18 enumera con nombre y apellido. */
  const rehacer = () => {
    /* R18 · `gestUpsert` deja un `setTimeout(gestPush, 700)` y `bitacoraRegistrar` uno de 900 ms.
       Hoy son inocuos porque `DASH` vuelve a null, pero el día que un caso anterior deje un `DASH`
       con `params.pass` harían un POST real con lo que haya en el almacén restaurado. */
    try { clearTimeout(_gestSyncT); } catch (e) {}
    try { clearTimeout(_bitSyncT); } catch (e) {}
    /* y los candados «en vuelo»: un caso que los deje puestos hace que el siguiente saltee su job
       en silencio y pase sin haber medido nada. */
    try { Object.keys(_gestEnVuelo).forEach(k => delete _gestEnVuelo[k]); } catch (e) {}
    try { Object.keys(_empEnVuelo).forEach(k => delete _empEnVuelo[k]); } catch (e) {}
    try { Object.keys(_bitEnVuelo).forEach(k => delete _bitEnVuelo[k]); } catch (e) {}
    try { Object.keys(_casosEnVuelo).forEach(k => delete _casosEnVuelo[k]); } catch (e) {}
    try { clearTimeout(_casosT); } catch (e) {}
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
    try { offPintar(); } catch (e) {}
  };
  try { localStorage.clear(); } catch (e) {}
  let r;
  try { r = fn(); } catch (e) { rehacer(); throw e; }
  if (r && typeof r.then === 'function') return r.finally(rehacer);
  /* el tick de gracia: deja pasar los `.then` que el caso haya disparado antes de restaurar */
  return new Promise(res => setTimeout(res, 0)).then(rehacer);
}

function p209Panel() {
  /* ⚠️ `f.emp` VA VACÍO, que es lo que produce `onDashData` de verdad: P185 sacó el selector de
     empresa y esa rama de `gestEmpresaActual` quedó muerta. Con el literal puesto, el caso
     ejercitaba la rama que no corre y pasaba por casualidad (el mismo texto en los dos lados). */
  /* `combinada: true` = la empresa NO tiene contraseña médica aparte, así que esta única clave abre
     las dos secciones y el servidor SÍ le acepta las gestiones. Es el caso más común y el que hace
     que «con el panel abierto no hay nada retenido» sea cierto. */
  return { vista: 'supervisor', combinada: true, f: { emp: '', dep: '', per: '' }, scope: 'Consorcio HELITEC',
           registros: [], params: { usuario: 'Consorcio HELITEC', empresa: 'Consorcio HELITEC', pass: 'x' }, demoMode: false };
}

/* ══ 1 · la clave de los dos almacenes no se evapora con el panel ═══════════════════════════════ */

PRUEBAS.caso('🔴 cerrar el panel no deja huérfana la gestión que todavía no salió', () => {
  /* `gestKey()` es la ÚNICA partición de gestiones y bitácora y salía de `DASH`. Al tocar la ✕,
     `closePortal()` hace `DASH = null` y la clave pasaba a «general»: los dos almacenes contestaban
     vacío. Y `sesionClavesBorrar()` borra las dos claves, así que la restricción y su línea de
     bitácora (R3) se iban sin haber salido nunca del teléfono. */
  return p209Limpio(() => {
    DASH = p209Panel();
    const claveConPanel = gestKey();
    gestUpsert({ id: 'g_p209', tipo: 'restriccion', persona: 'ANA SUAREZ', creada: Date.now() });
    PRUEBAS.igual(Object.keys(gestStore().up).length, 1, 'guarda: la gestión quedó pendiente de subir');
    DASH = null;   // lo que hace `closePortal()`
    PRUEBAS.igual(gestKey(), claveConPanel, '🔴 la clave sigue siendo la misma con el panel cerrado');
    PRUEBAS.igual(gestStore().items.length, 1, '🔴 y el almacén se sigue encontrando');
    PRUEBAS.igual(Object.keys(gestStore().up).length, 1, 'con su pendiente');
    /* DISCRIMINADOR · sin el respaldo persistido, la clave cae a «general» y el almacén se ve vacío */
    try { localStorage.removeItem(K_GEST_EMPRESA); } catch (e) {}
    PRUEBAS.igual(gestKey(), 'general', 'DISCRIMINADOR · sin el respaldo, la clave era «general»…');
    PRUEBAS.igual(gestStore().items.length, 0, '…y el almacén contestaba vacío, que es el defecto');
  });
});

PRUEBAS.caso('🔴 y el cartel cuenta las CINCO colas, aunque la clave del panel se haya perdido', () => {
  /* Segunda defensa, independiente de la primera: el contador recorre TODAS las particiones. Hace
     falta porque el respaldo sólo recupera la ÚLTIMA empresa, y alguien puede haber trabajado dos.
     Es lo que hace que «Cerrar sesión» diga «hay N sin enviar» en vez de entrar con 0. */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_a', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    bitacoraRegistrar('restriccion', 'ANA', { tarea: 'x' });
    const conPanel = offPendientes();
    PRUEBAS.alMenos(conPanel, 2, 'guarda: con el panel abierto se cuentan la gestión y su línea de bitácora');
    DASH = null;
    try { localStorage.removeItem(K_GEST_EMPRESA); } catch (e) {}   // el peor caso: ni respaldo
    PRUEBAS.igual(offPendientes(), conPanel,
      '🔴 el contador da lo mismo con el panel cerrado y sin respaldo: recorre todas las particiones');
    PRUEBAS.igual(gestKey(), 'general', '⚠️ y esto confirma que la clave SÍ se perdió: lo que salva el número es el recorrido, no la clave');
  });
});

/* ══ 2 · la cola de gestiones, que era la única sin reintento ═══════════════════════════════════ */

PRUEBAS.caso('🔴 una gestión que el servidor rechaza se traba, y el cartel deja rescatarla', () => {
  /* Era la única de las cinco colas sin noción de trabado: `.catch(()=>{})` se tragaba el error,
     `s.up[id]` quedaba puesto, el cartel decía «Enviando 1 registro…» indefinidamente y NO se
     dejaba tocar, porque `trabados` se calculaba sin mirar gestiones. */
  return p209Limpio(() => {
    const oPostSalir = window.gestPostSalir;
    let posts = 0;
    window.gestPostSalir = () => { posts++; return Promise.resolve({ ok: false, error: 'servidor caído' }); };
    DASH = p209Panel();
    gestUpsert({ id: 'g_p209', tipo: 'restriccion', persona: 'ANA SUAREZ', creada: Date.now() });
    let cadena = Promise.resolve();
    for (let i = 0; i < COLA_MAX_INTENTOS; i++) cadena = cadena.then(() => gestPush());
    return cadena.then(() => {
      PRUEBAS.igual(posts, COLA_MAX_INTENTOS, 'guarda: se intentó hasta el tope');
      PRUEBAS.igual(gestTrabados().length, 1, '🔴 y queda TRABADO: antes esta cola no tenía la noción');
      PRUEBAS.igual(offPendientes(), 1, '⚠️ trabado no es borrado: la restricción sigue ahí');
      const antes = posts;
      return gestPush().then(() => {
        PRUEBAS.igual(posts - antes, 0, '🔴 y ya no se reintenta solo: el cartel dejaría de mentir');
        try { offPintar(); } catch (e) {}
        const barra = document.getElementById('offBar');
        PRUEBAS.cierto(!!(barra && barra.onclick), '🔴 el cartel se puede TOCAR (antes `onclick` era null para esta cola)');
        PRUEBAS.igual(barra && barra.getAttribute('role'), 'button', 'y se anuncia como botón');
        PRUEBAS.cierto((barra && barra.textContent || '').indexOf(t('off_trabado_1')) >= 0,
          'diciendo que no se pudo enviar, no «Enviando…» · ' + (barra && barra.textContent || '').slice(0, 50));
        gestDestrabar();
        PRUEBAS.igual(gestTrabados().length, 0, 'y tocarlo lo destraba, como en las otras cuatro colas');
      });
    }).finally(() => { window.gestPostSalir = oPostSalir; });
  });
});

PRUEBAS.caso('⚠️ y la cola de gestiones tiene las DOS puertas de reintento que le faltaban', () => {
  /* Lo que hacía falta no era sólo trabar: era que algo la reintentara. Sus únicos llamadores eran
     escribir la gestión, abrir la ventana de Gestiones y cerrar sesión — y las acciones que la usan
     (restricción, determinación, telemedicina) se hacen desde Aptitud, que no tiene esa ventana.
     Se comprueba sobre el FUENTE porque es lo único que demuestra que el par existe: medir el
     `setInterval` de 60 s en la suite exigiría esperar un minuto. Mismo método que `p200e`. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    /* Sin comentarios: el que explica el defecto nombra las dos cosas. Mismo método que `p200e`. */
    const codigo = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/[^\n]*/gm, ' ');
    PRUEBAS.cierto(/addEventListener\('online',\s*function\(\)\{\s*gestScheduleSync\(\)/.test(codigo),
      '🔴 al volver la señal se reintentan las gestiones · era la ÚNICA de las cinco colas sin `online`');
    PRUEBAS.cierto(/setInterval\(function\(\)\{\s*gestPush\(\);\s*\},\s*60000\)/.test(codigo),
      '🔴 y cada 60 s, para la red que se cae sin disparar `online`');
    PRUEBAS.cierto(/gestDestrabar\(\);/.test(codigo) && /try \{ gestPush\(\); \} catch\(e\)\{\}/.test(codigo),
      '⚠️ y `colaReintentar` la destraba y la reenvía junto con las otras cuatro');
  });
});

/* ══ 3 · la cola del empleado, que reintentaba para siempre ═════════════════════════════════════ */

PRUEBAS.caso('🔴 un ítem que se rindió NO se reintenta cada 60 s para siempre', () => {
  /* `empFallo` marcaba `trabado` a los `COLA_MAX_INTENTOS` y `empFlush` no lo miraba nunca. El tope
     no servía para nada: 1.440 envíos por día. Y como el freno del servidor es por dispositivo (40
     escrituras cada 600 s), con cuatro trabados el teléfono queda pegado al techo y el turno que la
     persona registra DESPUÉS también se rechaza — y entra a la misma cola. */
  return p209Limpio(() => {
    const oFetch = window.fetchConReloj;
    let envios = 0;
    window.fetchConReloj = () => { envios++; return Promise.resolve({ json: () => Promise.resolve({ ok: false, error: 'Falta id' }) }); };
    setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
    localStorage.setItem(K_EMP_COLA, JSON.stringify({
      vivo:    { accion: 'turno_guardar', payload: { id: 'vivo' },    creada: Date.now(), intentos: 0 },
      trabado: { accion: 'turno_guardar', payload: { id: 'trabado' }, creada: Date.now(), intentos: COLA_MAX_INTENTOS, trabado: true },
      /* ⚠️ VIEJO Y SIN AGOTAR INTENTOS. La primera versión de P209 le agregó a esta cola la poda a
         7 días de `flushPending` y este caso EXIGÍA que se borrara. El verificador demostró que ahí
         se pierde lo que la persona escribió sin haberlo intentado nunca: `flushPending` mide desde
         el primer FALLO y acá el único reloj es `creada`, o sea desde que la persona lo escribió.
         La poda se sacó (decisión de Franco) y ahora este ítem tiene que SEGUIR ESTANDO. */
      viejo:   { accion: 'turno_guardar', payload: { id: 'viejo' },   creada: Date.now() - 20 * 86400000, intentos: 2 }
    }));
    Object.keys(_empEnVuelo).forEach(k => delete _empEnVuelo[k]);
    try {
      empFlush();
      PRUEBAS.igual(envios, 2, '🔴 salen el vivo y el viejo; el TRABADO no se reintenta solo (ése era el defecto)');
      const cola = Object.keys(empColaAll()).sort();
      PRUEBAS.igual(cola, ['trabado', 'viejo', 'vivo'], '🔴 y NADIE se borra por viejo: R7 · lo que la persona escribió no se tira solo');
      PRUEBAS.cierto(empColaAll().trabado, '⚠️ el trabado se conserva: la persona todavía puede destrabarlo con el cartel');
      /* DISCRIMINADOR · al SALIR sí se manda todo, trabados incluidos: es el último intento */
      envios = 0;
      Object.keys(_empEnVuelo).forEach(k => delete _empEnVuelo[k]);
      empFlush(true);
      PRUEBAS.igual(envios, 3, 'DISCRIMINADOR · al cerrar sesión salen los tres, trabado incluido');
    } finally {
      window.fetchConReloj = oFetch;
      Object.keys(_empEnVuelo).forEach(k => delete _empEnVuelo[k]);
    }
  });
});

/* ══ 4 · el PVT que todavía está en la cola ═════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 el PVT hecho sin señal no desaparece al sincronizar', () => {
  /* `misSincronizar` reemplazaba el arreglo entero de PVT con el del servidor, así que el PVT hecho
     en pista sin señal —guardado local, todavía en la cola— se borraba del teléfono en la primera
     sincronización. Y no es sólo un número: `renderInicio` arma «Tu estado hoy» con esa lista.
     ⚠️ `misGuardarPvt` IGNORA la fecha que se le pase y escribe siempre `todayStr()`. La primera
     versión de este caso le pasaba una fecha fija y sólo pasaba porque ese día era hoy: mañana se
     ponía en rojo sin que nadie tocara código. Lo cazó el verificador. */
  return p209Limpio(() => {
    const oFetch = window.fetchConReloj, oSes = window.sesPersonaToken;
    window.sesPersonaToken = () => 'tok';
    setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
    misGuardarPvt({ rt_prom: 312, lapsos: 1 });
    const hoy = todayStr();
    PRUEBAS.igual(misDatos().pvt.map(x => x.fecha), [hoy], 'guarda: el PVT local quedó con la fecha de HOY');
    /* el servidor no tiene el de hoy (nunca llegó) y manda DOS del mismo día anterior */
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, registros: [],
      pvt: [{ persona: 'ANA SUAREZ', fecha: '2026-09-20', rt_prom: 280, lapsos: 0 },
            { persona: 'ANA SUAREZ', fecha: '2026-09-20', rt_prom: 410, lapsos: 2 }] }) });
    return misSincronizar().then(() => {
      const pvt = misDatos().pvt;
      PRUEBAS.cierto(pvt.some(x => x.fecha === hoy), '🔴 el PVT local de hoy SOBREVIVE a la sincronización');
      /* ⚠️ Y LAS DOS DEL SERVIDOR TAMBIÉN. La primera versión del arreglo indexaba por fecha y las
         colapsaba en una: `aptAutoDeRegs` mira `pv[0]` y `pv[1]` para decidir si un 'alto' aislado
         baja a 'medio', así que perder el segundo PVT del día cambiaba el semáforo del inicio. */
      PRUEBAS.igual(pvt.filter(x => x.fecha === '2026-09-20').length, 2,
        '🔴 y el servidor no pierde filas: manda UNA POR PRUEBA, y dos del mismo día son dos');
      PRUEBAS.igual(pvt.length, 3, 'tres en total: las dos del servidor más la local que él no vio');
    }).then(() => {
      /* ⚠️ EL ESCENARIO QUE LA SEGUNDA VERSIÓN DEL ARREGLO PERDÍA: dos PVT el mismo día. El de las
         06:00 salió y el servidor lo tiene; el de las 14:00 se hizo sin señal y `misGuardarPvt`
         PISÓ al de las 06:00 en el teléfono (guarda uno por día, el último). Descartando lo local
         por fecha repetida, el resultado de las 14:00 desaparecía y el semáforo del inicio volvía
         al dato viejo. Se compara por el RESULTADO, que es la única identidad que hay. */
      misGuardarPvt({ rt_prom: 455, lapsos: 4 });   // el de las 14:00, sin señal
      window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, registros: [],
        pvt: [{ persona: 'ANA SUAREZ', fecha: hoy, rt_prom: 290, lapsos: 0 }] }) });   // el servidor sólo tiene el de las 06:00
      return misSincronizar();
    }).then(() => {
      const deHoy = misDatos().pvt.filter(x => x.fecha === hoy).map(x => x.rt_prom).sort((a, b) => a - b);
      PRUEBAS.igual(deHoy, [290, 455], '🔴 sobreviven LOS DOS del día: el que el servidor tiene y el que todavía no vio');
    }).then(() => {
      /* DISCRIMINADOR · si el servidor YA trae ese mismo resultado, la local no se duplica */
      window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, registros: [],
        pvt: [{ persona: 'ANA SUAREZ', fecha: hoy, rt_prom: 290, lapsos: 0 },
              { persona: 'ANA SUAREZ', fecha: hoy, rt_prom: 455, lapsos: 4 }] }) });
      return misSincronizar();
    }).then(() => {
      const deHoy = misDatos().pvt.filter(x => x.fecha === hoy);
      PRUEBAS.igual(deHoy.length, 2, 'DISCRIMINADOR · dos, no tres: lo local que el servidor ya trae no se duplica');
    }).finally(() => {
      window.fetchConReloj = oFetch; window.sesPersonaToken = oSes;
      _misSincronizando = false; _misSincEnVuelo = null; _misSincDias = 0;
    });
  });
});


/* ══ 5 · lo que el propio arreglo rompió, y el verificador cazó ═════════════════════════════════ */

PRUEBAS.caso('🔴 tocar «intentar otra vez» REENVÍA el turno viejo, no lo borra', () => {
  /* ⚠️ LA PODA NUEVA CONVERTÍA ESE BOTÓN EN UN BORRADOR. `colaReintentar` deja `trabado:false` y
     siete líneas después llama a `empFlush`, que poda a 7 días los NO trabados: un turno de 8 días
     trabado se destrababa y se BORRABA sin hacer un solo POST. El cartel se apagaba y el turno no
     existía más. Es textualmente el defecto que `flushPending` documenta haber cerrado, y por eso
     esa cola resetea `x.ts`; la copia se había llevado sólo la mitad. */
  return p209Limpio(() => {
    const oFetch = window.fetchConReloj;
    let envios = 0;
    /* el servidor RECHAZA: así el ítem no se borra por haber salido bien, y se puede comprobar que
       sigue en la cola. Con `{ok:true}` la comprobación de abajo no discriminaba nada. */
    window.fetchConReloj = () => { envios++; return Promise.resolve({ json: () => Promise.resolve({ ok: false, error: 'servidor caído' }) }); };
    setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
    localStorage.setItem(K_EMP_COLA, JSON.stringify({
      viejoTrabado: { accion: 'turno_guardar', payload: { id: 'viejoTrabado' },
                      creada: Date.now() - 20 * 86400000, intentos: COLA_MAX_INTENTOS, trabado: true }
    }));
    Object.keys(_empEnVuelo).forEach(k => delete _empEnVuelo[k]);
    try {
      PRUEBAS.igual(empTrabados().length, 1, 'guarda: hay un trabado de 20 días, que es lo que el cartel ofrece rescatar');
      colaReintentar();
      PRUEBAS.alMenos(envios, 1, '🔴 se INTENTA enviarlo');
      PRUEBAS.cierto(!!empColaAll().viejoTrabado,
        '🔴 y SIGUE EN LA COLA: tocar el botón que promete rescatarlo no puede ser lo que lo borre');
      PRUEBAS.falso(!!(empColaAll().viejoTrabado || {}).trabado, 'y quedó destrabado, que es lo que el botón hace');
    } finally {
      window.fetchConReloj = oFetch;
      Object.keys(_empEnVuelo).forEach(k => delete _empEnVuelo[k]);
    }
  });
});

PRUEBAS.caso('🔴 «cerrar sesión» sin el panel abierto no promete lo que no puede enviar', () => {
  /* El botón vive fuera del panel, así que `DASH` es null: `gestPush(true)` y `bitPush(true)` salían
     en su primera línea sin hacer un POST, y `cerrarSesion()` borra sus claves un instante después.
     P209 arregló la mitad que INFORMA (el contador ahora los ve) y al principio dejó quieta la que
     ACTÚA: la app pasó de fallar en silencio a prometer y fallar. Lo cazó el verificador. */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_salida', tipo: 'restriccion', persona: 'ANA SUAREZ', creada: Date.now() });
    DASH = null;   // lo que hace `closePortal()`
    PRUEBAS.alMenos(offPendientes(), 1, 'guarda: el contador lo ve (ése es el arreglo de más arriba)');
    /* sin credencial guardada NO hay forma de mandarlo, y el aviso tiene que decirlo */
    try { localStorage.removeItem(K_DASH_CREDS); } catch (e) {}
    try { localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
    PRUEBAS.alMenos(colasRetenidas(), 1, '🔴 la app SABE que eso no puede salir…');
    /* ⚠️ SE MIDE QUE EL AVISO SEA DISTINTO Y NOMBRE LOS QUE NO PUEDEN SALIR, no que contenga una
       palabra: la primera versión buscaba «panel» y se puso en rojo al reescribir el texto para
       sacarle una receta que al supervisor no le sirve. Medir la palabra no es medir el aviso. */
    const avisoNormal = t('salir_pendientes', { n: 2 });
    const avisoRetenido = t('salir_pendientes_panel', { n: 2, m: 1 });
    PRUEBAS.cierto(avisoRetenido !== avisoNormal, '…y el aviso es OTRO, no el que promete enviarlos');
    PRUEBAS.cierto(avisoRetenido.indexOf('1') >= 0 && avisoRetenido.length > 40,
      'y dice cuántos son los que no van a poder salir');
    /* ⚠️ DISCRIMINADOR CON EL SHAPE REAL: desde S4 lo guardado es `{usuario, token}`, NUNCA `pass`
       —lo dice `dashSaveCreds` con todas las letras—. La primera versión de este caso escribía el
       shape legado con `dashSaveCredsValues`, y por eso no vio que `gestCredDeSalida` pedía `pass`
       y era código MUERTO en todo teléfono con «Sí, recordar» puesto. R17. */
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok-s4' })); } catch (e) {}
    PRUEBAS.cierto(!!gestCredDeSalida('medico'), 'DISCRIMINADOR · con la credencial guardada (con TOKEN) de la misma empresa, hay por dónde mandarlo');
    /* ⚠️ y la de OTRA empresa no sirve: mandar las gestiones de una con la credencial de otra las
       archivaría bajo el `gestScope` equivocado, que es peor que perderlas. */
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Otra Empresa', token: 'tok-s4' })); } catch (e) {}
    PRUEBAS.falso(!!gestCredDeSalida('medico'), '⚠️ la credencial de OTRA empresa NO habilita el envío');
    /* ⚠️ y la de SUPERVISOR tampoco sirve para gestiones: `accionGestionGuardar` exige
       `acc.vista === "medico"`, así que mandar con la otra daría «No autorizado» y el aviso habría
       dicho que sí se podía. El rol es parte del contrato, no sólo la empresa. */
    try { localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
    try { localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok-s4' })); } catch (e) {}
    PRUEBAS.falso(!!gestCredDeSalida('medico'), '⚠️ la credencial de SUPERVISOR no habilita las gestiones: el servidor sólo se las acepta al médico');
    PRUEBAS.cierto(!!gestCredDeSalida(), 'pero sí la bitácora, a la que `bitacora_guardar` sólo le cierra la puerta a Dirección');
  });
});

PRUEBAS.caso('🔴 la demostración y el panel del empleado no pisan la empresa anclada', () => {
  /* El ancla se ponía en `gestSaveStore`, o sea en CADA guardado del almacén — incluido el que
     `gestPush` hace al final aunque no tenga nada que mandar. Con eso, abrir la demostración, o el
     panel «Mis estadísticas» (cuyo `scope` es el NOMBRE de la persona), dejaba huérfana la partición
     que sí tenía pendientes: exactamente el estado que P209 vino a matar, y ahora persistido. */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_ancla', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    /* por el LECTOR real, no leyendo la clave en crudo: desde P209 el ancla guarda empresa Y
       usuario del login (la columna A y la D de `Accesos` no son la misma). R17. */
    const anclada = gestEmpresaRecordada();
    PRUEBAS.igual(anclada, 'Consorcio HELITEC', 'guarda: escribir una gestión ancla la empresa');
    /* la demo escribe en su propia partición… */
    DASH = { vista: 'supervisor', f: { emp: '', dep: '', per: '' }, scope: 'Empresa Demo',
             registros: [], params: { usuario: 'd', pass: 'x' }, demoMode: true };
    gestUpsert({ id: 'g_demo', tipo: 'anotacion', persona: 'DEMO', creada: Date.now() });
    PRUEBAS.igual(gestEmpresaRecordada(), anclada, '🔴 …y NO pisa el ancla de la empresa real');
    /* …y el panel del empleado tampoco, aunque su `scope` sea un nombre de persona */
    DASH = { vista: 'empleado', f: { emp: '', dep: '', per: '' }, scope: 'ANA SUAREZ',
             registros: [], params: { usuario: 'ANA SUAREZ', pass: 'tok' }, demoMode: false };
    gestPush();   // el camino que la pisaba: termina en `gestSaveStore` aunque no mande nada
    PRUEBAS.igual(gestEmpresaRecordada(), anclada, '🔴 ni el panel del empleado, ni `gestPush` sin nada que mandar');
    /* DISCRIMINADOR · un panel de empresa de verdad SÍ la actualiza */
    DASH = { vista: 'supervisor', f: { emp: '', dep: '', per: '' }, scope: 'Otra Empresa',
             registros: [], params: { usuario: 'o', pass: 'x' }, demoMode: false };
    gestUpsert({ id: 'g_otra', tipo: 'restriccion', persona: 'JUAN', creada: Date.now() });
    PRUEBAS.igual(gestEmpresaRecordada(), 'Otra Empresa', 'DISCRIMINADOR · un panel real de otra empresa sí la ancla');
  });
});


PRUEBAS.caso('🔴 el cartel dice RETENIDO, no «Enviando…», cuando nadie puede mandar eso', () => {
  /* ⚠️ ESTO LO INTRODUJO EL ARREGLO DE MÁS ARRIBA. Contar todas las particiones es correcto, pero
     `gestPush` empuja UNA SOLA: el cartel quedaba diciendo «Enviando N registros…» de algo que
     nadie estaba mandando, y como `trabados` era 0 tampoco se dejaba tocar. En un teléfono que ya
     tenía pendientes viejos aparecía apenas actualizara. Y con dos particiones era peor: tocarlo
     borraba los `fallos` de las dos, mandaba una, y el cartel quedaba así para siempre.
     Tercer estado, decidido por Franco: ni «enviando» ni «falló» — RETENIDO, con qué hacer. */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_ret', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    DASH = null;   // panel cerrado: nadie puede empujar esa partición
    /* ⚠️ CON LA CREDENCIAL RECORDADA PUESTA, que es «el caso normal» según el propio código. La
       versión anterior de este caso la borraba antes de medir y por eso no vio el defecto: la
       credencial guardada sólo habilita el envío en el camino `alSalir`, así que para el CARTEL
       esa gestión sigue retenida. Medir el sub-escenario sano es no medir. */
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok' })); } catch (e) {}
    PRUEBAS.alMenos(colasRetenidas(), 1, '🔴 para el cartel sigue retenida: el `setInterval` de 60 s no usa la credencial guardada');
    PRUEBAS.igual(colasRetenidas(true), 0, '⚠️ y para CERRAR SESIÓN no, porque ese camino sí la usa · dos consumidores, dos respuestas');
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
    PRUEBAS.alMenos(colasRetenidas(), 1, 'guarda: la app sabe que eso no lo puede mandar nadie ahora');
    offPintar();
    const barra = document.getElementById('offBar');
    const txt = (barra && barra.textContent) || '';
    PRUEBAS.falso(txt.indexOf(t('off_enviando_1').slice(0, 12)) >= 0 && txt.indexOf(t('off_retenido_1')) < 0,
      '🔴 no dice «Enviando…» de algo que nadie está enviando');
    PRUEBAS.cierto(txt.indexOf(t('off_retenido_1')) >= 0 || txt.indexOf(t('off_retenido_n', { n: 1 })) >= 0,
      '🔴 dice que está RETENIDO y qué hay que hacer · ' + txt.slice(0, 60));
    /* DISCRIMINADOR · con el panel abierto eso SÍ se puede mandar, y el cartel vuelve a «Enviando…» */
    DASH = p209Panel();
    PRUEBAS.igual(colasRetenidas(), 0, 'DISCRIMINADOR · con el panel de esa empresa abierto no hay nada retenido');
    offPintar();
    const txt2 = (document.getElementById('offBar') || {}).textContent || '';
    PRUEBAS.falso(txt2.indexOf(t('off_retenido_1')) >= 0, 'y el cartel deja de decirlo');
  });
});


PRUEBAS.caso('🔴 el aviso de cerrar sesión y el envío preguntan LO MISMO, cola por cola', () => {
  /* ⚠️ EL TRAMO QUE NINGÚN CASO MEDÍA, y por eso el defecto pasó dos rondas. `colasRetenidas()` usaba
     UN «¿tengo alguna credencial?» para las tres colas, mientras cada push pregunta por la suya:
     gestiones y casos Odoo exigen la MÉDICA (el servidor les pide `acc.vista === "medico"`), la
     bitácora acepta también la de supervisor.
     Escenario real: supervisor de una empresa con contraseña médica aparte. Tiene guardada la de
     supervisor y NO la médica. Con el `puede` único, «retenidos» daba 0 → el aviso prometía «toca
     Aceptar para intentar enviarlos» → `gestPush(true)` salía sin un solo POST → `cerrarSesion()`
     borraba la cola. La restricción se perdía con la promesa en pantalla un segundo antes. */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_puerta', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    DASH = null;
    /* sólo la credencial de SUPERVISOR, que es la que el servidor NO acepta para gestiones */
    try { localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
    try { localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok' })); } catch (e) {}
    PRUEBAS.cierto(!!gestCredDeSalida(), 'guarda: hay credencial de supervisor…');
    PRUEBAS.falso(!!gestCredDeSalida('medico'), '…y no hay médica, que es la que las gestiones necesitan');
    PRUEBAS.alMenos(colasRetenidas(), 1,
      '🔴 esa gestión cuenta como RETENIDA: el aviso no puede prometer un envío que `gestPush` no va a hacer');
    /* DISCRIMINADOR · con la médica puesta, deja de estar retenida PARA EL CAMINO DE SALIDA.
       ⚠️ `colasRetenidas(true)`, no `colasRetenidas()`: la credencial guardada sólo habilita el
       envío en `alSalir`. La versión anterior de esta línea usaba la forma sin argumento y con eso
       CEMENTABA el defecto — el cartel decía «Enviando…» de algo que nadie mandaba. */
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok' })); } catch (e) {}
    PRUEBAS.igual(colasRetenidas(true), 0, 'DISCRIMINADOR · con la credencial que el servidor sí acepta, el camino de salida sí puede mandarla');
    PRUEBAS.alMenos(colasRetenidas(), 1, '⚠️ pero para el cartel sigue retenida: fuera de `alSalir` esa credencial no se usa');
  });
});

PRUEBAS.caso('🔴 la credencial sirve aunque el usuario del login NO sea el nombre canónico', () => {
  /* El `usuario` es la columna A de `Accesos` y el canónico —de donde sale `gestKey()`— es la D. El
     `.gs` lo tiene medido contra producción: «esta lista decía “Helitec” y el alta guardaba
     “Consorcio HELITEC”», con cuatro cuentas así. Comparando sólo contra la clave canónica, el
     último intento era código muerto justo en esos clientes. El arnés lo tapaba poniendo el mismo
     texto en los dos lados (R17). */
  return p209Limpio(() => {
    DASH = { vista: 'supervisor', f: { emp: '', dep: '', per: '' }, scope: 'Consorcio HELITEC',
             registros: [], params: { usuario: 'Helitec', empresa: 'Helitec', pass: 'x' }, demoMode: false };
    gestUpsert({ id: 'g_alias', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    DASH = null;
    PRUEBAS.igual(gestKey(), 'consorcio helitec', 'guarda: la partición es la CANÓNICA');
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Helitec', token: 'tok' })); } catch (e) {}
    PRUEBAS.cierto(!!gestCredDeSalida('medico'),
      '🔴 la credencial guardada con el nombre del LOGIN sirve para la partición canónica');
    /* DISCRIMINADOR · la de otra empresa sigue sin servir */
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'El Cairo', token: 'tok' })); } catch (e) {}
    PRUEBAS.falso(!!gestCredDeSalida('medico'), 'DISCRIMINADOR · la de OTRA empresa no, ni por el alias ni por el canónico');
  });
});


PRUEBAS.caso('🔴 EL USO, no la pieza: `gestPush(true)` sin panel produce un POST con la credencial guardada', () => {
  /* ⚠️ LO QUE NINGÚN CASO MEDÍA, y por eso una versión de `gestCredDeSalida` que pedía `c.pass`
     —donde S4 guarda `token`— fue código muerto con la suite en verde. Los otros casos miden
     `gestCredDeSalida()` y `colasRetenidas()`: eso es leer la guarda, no ver salir el pedido. */
  return p209Limpio(() => {
    const oPostSalir = window.gestPostSalir;
    const cuerpos = [];
    window.gestPostSalir = (alSalir, body) => { cuerpos.push(body); return Promise.resolve({ ok: true }); };
    DASH = p209Panel();
    gestUpsert({ id: 'g_uso', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    DASH = null;   // panel cerrado, como al tocar «Cerrar sesión»
    try { localStorage.setItem(K_DASH_CREDS_MED, JSON.stringify({ usuario: 'Consorcio HELITEC', token: 'tok-s4' })); } catch (e) {}
    return gestPush(true).then(() => {
      PRUEBAS.igual(cuerpos.length, 1, '🔴 SALE el pedido: con el panel cerrado y la credencial guardada, el último intento existe');
      const b = cuerpos[0] || {};
      PRUEBAS.igual(b.action, 'gestion_guardar', 'con la acción que corresponde');
      PRUEBAS.igual(b.pass, 'tok-s4', '🔴 y con la credencial LLENA: el token de S4, no una cadena vacía');
      PRUEBAS.igual(b.usuario, 'Consorcio HELITEC', 'y el usuario con el que se guardó');
      PRUEBAS.cierto(!!b.empresa, 'y la empresa de la partición');
      /* DISCRIMINADOR · sin `alSalir` esa credencial NO se usa: el reloj de 60 s no manda nada */
      cuerpos.length = 0;
      Object.keys(_gestEnVuelo).forEach(k => delete _gestEnVuelo[k]);
      return gestPush().then(() => {
        PRUEBAS.igual(cuerpos.length, 0, 'DISCRIMINADOR · sin `alSalir` no sale nada: la credencial guardada es sólo para el camino de salida');
      });
    }).finally(() => { window.gestPostSalir = oPostSalir; });
  });
});

PRUEBAS.caso('🔴 con el panel de un SUPERVISOR de empresa con clave médica aparte, la gestión cuenta como retenida', () => {
  /* El servidor exige `acc.vista === "medico"` para `gestion_guardar`, y `restPuede()` deja crear
     restricciones sólo al supervisor. En una empresa con contraseña médica separada esas dos cosas
     no se cruzan nunca: el panel abierto NO alcanza para mandarlas. Sin esta guarda, el cartel
     decía «Enviando…» y el aviso de cerrar sesión explicaba cómo salvarlas abriendo el panel —
     receta que no funciona, y diez minutos después el segundo confirm las borraba. */
  return p209Limpio(() => {
    /* `combinada: false` = la empresa SÍ tiene contraseña médica aparte */
    DASH = { vista: 'supervisor', combinada: false, f: { emp: '', dep: '', per: '' }, scope: 'Consorcio HELITEC',
             registros: [], params: { usuario: 'Consorcio HELITEC', empresa: 'Consorcio HELITEC', pass: 'x' }, demoMode: false };
    gestUpsert({ id: 'g_sup', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    PRUEBAS.alMenos(colasRetenidas(), 1,
      '🔴 retenida CON el panel abierto: el servidor no le acepta gestiones a la vista de supervisor');
    /* DISCRIMINADOR · con `combinada` (la clave única abre las dos secciones) sí puede */
    DASH.combinada = true;
    PRUEBAS.igual(colasRetenidas(), 0, 'DISCRIMINADOR · con la clave combinada el servidor sí se las acepta');
    /* y la bitácora del mismo supervisor sí puede: `bitacora_guardar` sólo le cierra la puerta a Dirección */
    DASH.combinada = false;
    bitacoraRegistrar('restriccion', 'ANA', { tarea: 'x' });
    const conBit = colasRetenidas();
    DASH.vista = 'hseq';
    PRUEBAS.alMenos(colasRetenidas(), conBit + 1, '⚠️ y para Dirección la bitácora TAMBIÉN queda retenida, que es lo que el servidor hace');
  });
});


PRUEBAS.caso('🔴 el cartel de retenidos NO tapa lo que la persona acaba de escribir', () => {
  /* `offPendientes()` cuenta las CINCO colas y `colasRetenidas()` sólo las tres del panel. Cortando
     con el número de los retenidos, el test que la persona hizo recién —que SÍ se está enviando—
     dejaba de nombrarse. El cartel existe para dar UNA respuesta a «¿se guardó lo que hice?». */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_tapa', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    DASH = null;   // esa gestión queda retenida
    try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
    /* ⚠️ DOS EN UNA COLA Y UNO EN LA OTRA, para que `a` y `b` sean DISTINTOS: con `a === b` el
       discriminador pasaba igual si alguien invirtiera los argumentos del texto. */
    setPending([{ url: 'https://example.test/x', ts: Date.now(), id: 'p_t1', intentos: 0 },
                { url: 'https://example.test/y', ts: Date.now(), id: 'p_t2', intentos: 0 }]);
    const n = offPendientes(), ret = colasRetenidas();
    PRUEBAS.igual(n, 3, 'guarda: hay tres pendientes en dos colas distintas');
    PRUEBAS.igual(ret, 1, 'y sólo uno está retenido');
    offPintar();
    const barra = document.getElementById('offBar');
    const txt = (barra || {}).textContent || '';
    PRUEBAS.cierto(txt.indexOf(t('off_mixto_1', { a: 2, b: 1 }).replace(/[.…]+\s*$/, '')) >= 0,
      '🔴 dice LAS DOS COSAS: 1 retenido y 2 enviándose · ' + txt.slice(0, 70));
    /* ⚠️ Y «Enviando» AL FINAL, porque los puntos se pegan ahí: latiendo detrás de la frase de lo
       que NO sale, la animación diría lo contrario de lo que significa. */
    PRUEBAS.cierto(/[Ee]nviando[^.]*$/.test(txt), '🔴 y la parte de «enviando» va al final, que es donde se pegan los puntos · ' + txt.slice(-40));
    /* ⚠️ Y CON LOS PUNTOS. En el estado mixto hay un envío VIVO: pintarlo estático reintroducía el
       cartel que P045 documenta como «indistinguible de uno colgado — el movimiento es la única
       parte del mensaje que no se puede fingir». */
    PRUEBAS.cierto(!!(barra && barra.querySelector('.off-dots')), '🔴 con los puntos animados: hay un envío en curso');
    PRUEBAS.cierto((barra.className || '').indexOf('off-bar-sync') >= 0, 'y en azul, no en el ámbar de «nada se está enviando»');
    /* DISCRIMINADOR · si TODO está retenido, no se inventa un «enviando 0» — y ahí sí va estático */
    setPending([]);
    offPintar();
    const barra2 = document.getElementById('offBar');
    PRUEBAS.cierto((barra2.textContent || '') === t('off_retenido_1'), 'DISCRIMINADOR · con todo retenido, sólo el texto de retenido');
    PRUEBAS.falso(!!barra2.querySelector('.off-dots'), 'y SIN puntos: no hay ningún envío en curso que animar');
  });
});

PRUEBAS.caso('🔴 el VISOR no escribe, y el servidor lo chequea antes que la vista', () => {
  /* `accionGestionGuardar` abre con `if (acc.soloLectura) return visorNoEscribe_(acc);` ANTES del
     chequeo de vista. La guarda del cliente copiaba sólo la segunda línea: un visor con
     `vista:'medico'` daba «se puede enviar» mientras el servidor rechazaba el 100 % de esos POST. */
  return p209Limpio(() => {
    DASH = p209Panel();
    gestUpsert({ id: 'g_visor', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
    /* el mismo panel, pero mirado por el visor del admin (P185) */
    DASH = Object.assign({}, p209Panel(), { vista: 'medico', combinada: false, visor: { empresa: 'Consorcio HELITEC', vista: 'medico' } });
    PRUEBAS.cierto(visorSoloLectura(), 'guarda: es un visor');
    PRUEBAS.alMenos(colasRetenidas(), 1, '🔴 su gestión cuenta como retenida: el visor no escribe');
    /* DISCRIMINADOR · el mismo panel sin visor sí puede */
    DASH = Object.assign({}, p209Panel(), { vista: 'medico', combinada: false });
    PRUEBAS.igual(colasRetenidas(), 0, 'DISCRIMINADOR · sin visor, la vista médica sí escribe gestiones');
  });
});

PRUEBAS.caso('⚠️ cuando NADA se puede enviar, el aviso no ofrece «enviar el resto»', () => {
  /* Por `p209Limpio` aunque no toque almacenes: es el único que fija el idioma (hace
     `localStorage.clear()`), y este caso afirma sobre un substring en español. Sin eso, un caso
     anterior que deje `K_LANG='en'` lo pone rojo por una causa ajena (R18). */
  return p209Limpio(() => {
  /* `n === m` es el caso normal para quien sólo usa el panel: `pg_olvidar_pendientes` se calcula
     sobre las mismas tres colas que `colasRetenidas`. Ofrecer «Toca Aceptar para intentar enviar el
     resto» sobre un conjunto vacío es la misma promesa vacía que este prompt vino a cerrar. */
  const conResto = t('salir_pendientes_panel', { n: 3, m: 1 });
  const sinResto = t('salir_pendientes_nada', { n: 3 });
  PRUEBAS.cierto(conResto !== sinResto, 'son dos textos distintos');
  PRUEBAS.cierto(conResto.indexOf('resto') >= 0, 'el de mezcla sí ofrece enviar el resto');
  PRUEBAS.falso(sinResto.indexOf('resto') >= 0, '⚠️ y el de «nada se puede enviar» NO lo ofrece');
  const olvSinResto = t('pg_olvidar_pendientes_nada', { n: 3 });
  PRUEBAS.falso(olvSinResto.indexOf('resto') >= 0, 'ídem en «Olvidar este dispositivo»');
  PRUEBAS.cierto(sinResto.indexOf('3') >= 0 && olvSinResto.indexOf('3') >= 0, 'los dos dicen cuántos son');
  });
});

PRUEBAS.caso('⚠️ lo que sembró la demostración no se cuenta como pendiente de nadie', () => {
  /* `gestSembrarDemo*` encola de verdad y la limpieza vive sólo en `closePortal()`: si alguien mata
     la pestaña con la demo abierta, esa partición queda con sus ejemplos. Al pasar a contar TODAS
     las particiones se volvían una alarma permanente — y el aviso de cerrar sesión llegaba a decir
     «avisa a tu supervisor» por datos que no existen. Los push ya los saltean. */
  return p209Limpio(() => {
    const todo = {};
    todo['empresa demo'] = { items: [{ id: 'gdemo1' }, { id: 'ademo_x' }], up: { gdemo1: 1, ademo_x: 1 }, del: {} };
    todo['consorcio helitec'] = { items: [{ id: 'g_real' }], up: { g_real: 1 }, del: {} };
    localStorage.setItem(K_GESTIONES, JSON.stringify(todo));
    PRUEBAS.igual(gestPendientesTodas(), 1, '⚠️ sólo cuenta la real: los dos ids sembrados por la demo no son pendientes de nadie');
    /* DISCRIMINADOR · si los ids no fueran de la demo, se contarían los tres */
    todo['empresa demo'] = { items: [{ id: 'x1' }, { id: 'x2' }], up: { x1: 1, x2: 1 }, del: {} };
    localStorage.setItem(K_GESTIONES, JSON.stringify(todo));
    PRUEBAS.igual(gestPendientesTodas(), 3, 'DISCRIMINADOR · con ids normales sí cuenta las tres');
  });
});


PRUEBAS.caso('🔴 EL USO · `cerrarSesionPedir` elige el mensaje según lo que de verdad puede salir', () => {
  /* ⚠️ LA SELECCIÓN DE LOS TRES MENSAJES ES EL CORAZÓN DEL CAMBIO Y NINGÚN CASO LA EJECUTABA: los
     que había comparaban cadenas sueltas con `t()`. Acá se entra por `cerrarSesionPedir` con
     `window.confirm` stubeado —como ya hacen diez archivos de la suite— y se mira QUÉ texto eligió.
     `cerrarSesion()` nunca corre porque el primer confirm devuelve false. */
  return p209Limpio(() => {
    const oConfirm = window.confirm;
    const vistos = [];
    window.confirm = (m) => { vistos.push(String(m)); return false; };   // se corta en el primero
    try {
      DASH = p209Panel();
      gestUpsert({ id: 'g_msg', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
      DASH = null;
      try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
      /* (a) TODO retenido: no puede ofrecer «enviar el resto» */
      cerrarSesionPedir();
      PRUEBAS.igual(vistos.length, 1, 'guarda: se mostró el aviso de pendientes');
      PRUEBAS.igual(vistos[0], t('salir_pendientes_nada', { n: 1 }),
        '🔴 con todo retenido elige el texto que NO promete enviar nada');
      /* (b) mezcla: uno retenido y otro que sí sale */
      vistos.length = 0;
      setPending([{ url: 'https://example.test/x', ts: Date.now(), id: 'p_msg', intentos: 0 }]);
      cerrarSesionPedir();
      PRUEBAS.igual(vistos[0], t('salir_pendientes_panel', { n: 2, m: 1 }),
        '🔴 con mezcla dice cuántos no pueden salir Y ofrece enviar el resto');
      /* (c) nada retenido: el aviso de siempre */
      vistos.length = 0;
      try { localStorage.removeItem(K_GESTIONES); } catch (e) {}
      cerrarSesionPedir();
      PRUEBAS.igual(colasRetenidas(true), 0, 'guarda: ya no queda nada retenido');
      PRUEBAS.igual(vistos[0], t('salir_pendientes', { n: 1 }),
        'DISCRIMINADOR · sin retenidos vuelve el aviso de siempre, que sí promete intentarlo');
    } finally { window.confirm = oConfirm; }
  });
});

PRUEBAS.caso('🔴 EL USO · «Olvidar este dispositivo» avisa y NO aborta al cancelar el envío', () => {
  /* Su `pend` es distinto del de `cerrarSesionPedir` —sólo las tres colas del panel, porque es lo
     único que esa acción deja sin salida— y cancelar el primer aviso significa «no los mandes», no
     «no olvides el dispositivo». Los tres textos terminan en «Toca Aceptar para…» justamente por
     eso: ninguno hace una pregunta de continuar/abortar. */
  return p209Limpio(() => {
    const oConfirm = window.confirm, oAvisar = window.sesionAvisarCierre;
    const vistos = [];
    window.sesionAvisarCierre = () => {};
    window.confirm = (m) => { vistos.push(String(m)); return false; };   // se cancela TODO
    try {
      DASH = p209Panel();
      gestUpsert({ id: 'g_olv', tipo: 'restriccion', persona: 'ANA', creada: Date.now() });
      DASH = null;
      /* ⚠️ CON UNA CREDENCIAL DE OTRA EMPRESA, no con cero. Sin ninguna, `portalPintarOlvidar`
         esconde el botón y nadie puede llegar acá: el caso entraba por un estado que la app no
         produce (R17). Con la de otra empresa el botón SÍ se ve y `gestCredDeSalida` igual da null,
         que es la rama que se quiere medir. */
      try { localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED); } catch (e) {}
      try { localStorage.setItem(K_DASH_CREDS_ADM, JSON.stringify({ usuario: 'Otra Empresa', token: 'tok' })); } catch (e) {}
      portalOlvidarDispositivo(null);
      PRUEBAS.igual(vistos.length, 2, '🔴 cancelar el aviso de pendientes NO aborta: se llega igual al confirm de olvidar');
      PRUEBAS.igual(vistos[0], t('pg_olvidar_pendientes_nada', { n: 1 }),
        'y el primero es el que dice que la app no los puede enviar desde aquí');
      PRUEBAS.igual(vistos[1], t('pg_olvidar_confirmar'), 'y el segundo es el de siempre');
      /* ⚠️ ESTO NO ALCANZA COMO DISCRIMINADOR si el segundo confirm cortó antes: el cuerpo que
         podría borrar no corrió. Se mide de nuevo DEJÁNDOLO pasar, que es el camino donde de verdad
         importa que las colas sobrevivan. */
      const gestAntes = localStorage.getItem(K_GESTIONES);
      window.confirm = () => true;
      vistos.length = 0;
      portalOlvidarDispositivo(null);
      PRUEBAS.igual(localStorage.getItem(K_GESTIONES), gestAntes,
        '🔴 aun ACEPTANDO todo, «olvidar el dispositivo» no borra la cola de gestiones: sólo retira credenciales');
      PRUEBAS.falso(!!localStorage.getItem(K_DASH_CREDS_ADM), '⚠️ y sí retira las credenciales, que es lo que promete');
    } finally { window.confirm = oConfirm; window.sesionAvisarCierre = oAvisar; }
  });
});
