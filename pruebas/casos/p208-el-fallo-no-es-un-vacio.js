/* ── P208 · un fallo no se pinta igual que un vacío ─────────────────────────────────────────────
   (2026-09-29 · de la auditoría de P205, dimensión «estados»)

   Cinco pantallas afirmaban «no hay nada» cuando lo que había pasado es que no se pudo preguntar.
   No es un matiz de redacción: una de ellas es la hoja donde puede estar una cita con el servicio
   médico, y otra es el umbral con el que se juzgó a una persona, que queda archivado en una hoja
   append-only (R3) y no se corrige nunca.

   El patrón correcto ya existía en este mismo archivo desde P187 —`cargaEstado()` con «viajando /
   error / ok», más `_reportesError`, `_opinionesError` y `_bitError`—; lo que faltaba era aplicarlo
   donde no estaba. Por eso casi todos los casos de acá tienen su DISCRIMINADOR: el estado vacío de
   verdad tiene que seguir diciendo «no hay nada», o el arreglo sería sólo un cartel que aparece
   siempre.

   ⚠️ R18 · todo lo que dispara una promesa restaura en el `.finally()` DE ESA PROMESA, nunca en el
   `finally` del bloque, que corre antes. */

PRUEBAS.grupo('P208 · un fallo no es un vacío');

/* ══ 1 · la hoja de tareas ══════════════════════════════════════════════════════════════════════ */

function p208ConTareas(respuesta, fn) {
  /* Entra por el camino REAL (R17): perfil puesto, `tareasCargar()` de verdad, y el `fetch`
     stubeado devolviendo lo que devolvería el servidor. Nada de `TAREAS.lista = []` a mano. */
  const oFetch = window.fetchConReloj, oPerfil = getProfile();
  const lista0 = TAREAS.lista, pend0 = TAREAS.pendientes, err0 = TAREAS.error, pedido0 = TAREAS.pedidoEn;
  const det0 = TAREAS.determinacion, cache0 = localStorage.getItem(K_TAREAS_CACHE);   // R18 · el camino `ok:true` ESCRIBE la caché
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  window.fetchConReloj = () => (respuesta === '__red__'
    ? Promise.reject(new Error('sin red'))
    : Promise.resolve({ json: () => Promise.resolve(respuesta) }));
  TAREAS.cargando = false; TAREAS._enVuelo = null; TAREAS.lista = []; TAREAS.pendientes = 0;
  return tareasCargar()
    .then(() => { tareasPintar(); return fn(document.getElementById('tareasLista')); })
    .finally(() => {
      window.fetchConReloj = oFetch;
      if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
      TAREAS.lista = lista0; TAREAS.pendientes = pend0; TAREAS.error = err0; TAREAS.pedidoEn = pedido0;
      TAREAS.determinacion = det0; TAREAS.cargando = false; TAREAS._enVuelo = null;
      if (cache0 == null) { try { localStorage.removeItem(K_TAREAS_CACHE); } catch (e) {} } else localStorage.setItem(K_TAREAS_CACHE, cache0);
      try { tareasPintarBadge(); } catch (e) {}
    });
}

PRUEBAS.caso('🔴 un rechazo del servidor NO se pinta como «no tienes tareas pendientes»', () => {
  /* `accionTareasMias` contesta `{ok:false, error:"La cédula no coincide con la persona."}` SIN
     `motivo`, así que no cae en la rama de la baja: llegaba al `if (!d || !d.ok) return;` mudo. */
  return p208ConTareas({ ok: false, error: 'La cédula no coincide con la persona.' }, (cont) => {
    const txt = cont.textContent || '';
    PRUEBAS.cierto(TAREAS.error, 'el rechazo queda marcado en TAREAS.error');
    PRUEBAS.falso(txt.indexOf(t('tar_vacio')) >= 0, '🔴 la hoja NO puede afirmar que no hay tareas: no se pudo preguntar');
    PRUEBAS.cierto(txt.indexOf(t('av_no_pudimos')) >= 0, 'y dice que no se pudo consultar el servidor');
    PRUEBAS.cierto(!!cont.querySelector('.dash-warn'), 'con el cartel de aviso, no como texto suelto');
  });
});

PRUEBAS.caso('DISCRIMINADOR · con `ok:true` y cero tareas SÍ dice «no tienes tareas pendientes»', () => {
  /* Sin esto el arreglo podría ser un cartel que aparece siempre, y el caso de arriba pasaría igual. */
  return p208ConTareas({ ok: true, tareas: [], pendientes: 0 }, (cont) => {
    const txt = cont.textContent || '';
    PRUEBAS.falso(TAREAS.error, 'una respuesta buena no deja error');
    PRUEBAS.cierto(txt.indexOf(t('tar_vacio')) >= 0, 'DISCRIMINADOR · el vacío de verdad se sigue diciendo');
    PRUEBAS.falso(txt.indexOf(t('av_no_pudimos')) >= 0, 'y no aparece ningún aviso de fallo');
  });
});

PRUEBAS.caso('un fallo de red tampoco es un vacío, y el intento siguiente limpia el aviso', () => {
  return p208ConTareas('__red__', (cont) => {
    PRUEBAS.cierto(TAREAS.error, 'el `.catch` también marca el fallo (antes dejaba todo como estaba, en silencio)');
    PRUEBAS.falso((cont.textContent || '').indexOf(t('tar_vacio')) >= 0, 'sin señal no se afirma que no hay tareas');
  }).then(() => p208ConTareas({ ok: true, tareas: [], pendientes: 0 }, () => {
    PRUEBAS.falso(TAREAS.error, 'y un intento que sale bien borra el error del anterior');
  }));
});

/* ══ 2 · el umbral de la bitácora ═══════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 sin la tabla de niveles, la bitácora registra CON QUÉ se juzgó y que no estaba confirmado', () => {
  /* ⚠️ ACÁ HAY UN ARREGLO CORREGIDO. La primera versión vaciaba los tres números (`nivel:null`), y
     el verificador demostró que eso es PEOR que el defecto original: `restDuracionesPara()` sigue
     ofreciendo `nivelInfo(3).maxRestrH` = 72 h, o sea que la decisión SE TOMÓ con la tolerancia del
     nivel 3. Una fila que no lo diga le saca a la bitácora el dato que R3 existe para conservar.
     Son dos hechos y van los dos: con qué se juzgó, y que nadie pudo confirmarlo. */
  const prev = DASH;
  try {
    DASH = { vista: 'supervisor', f: { emp: 'Consorcio HELITEC' }, registros: [], _niveles: null, _nivelesError: true };
    nivelCacheClear();
    const u = bitUmbralDe('ANA SUAREZ');
    PRUEBAS.igual(u.nivel, NIVEL_DEFAULT, '🔴 la fila dice el nivel con el que SE JUZGÓ — es el que el formulario aplicó');
    PRUEBAS.cierto(u.amarillo > 0 && u.rojo > 0, 'y las dos tolerancias, por la misma razón');
    PRUEBAS.cierto(u.sinNiveles === true, '🔴 y ADEMÁS que no se pudo confirmar: es lo que faltaba, no lo que sobraba');
    /* el tercer estado, que es lo que evita afirmar por las filas viejas: una fila SIN la clave no
       es «confirmada», es «de una app que no sabía marcarlo». El CSV lo exporta vacío. */
    PRUEBAS.igual((function(){ const e = { umbral: { nivel: 3 } };   // fila de antes de la 6.91
      return (e.umbral && typeof e.umbral.sinNiveles === 'boolean') ? (e.umbral.sinNiveles ? t('csv_no') : t('csv_si')) : ''; })(), '',
      '⚠️ y una fila anterior a 6.91 sale VACÍA en `UmbralConfirmado`: poner «sí» sería afirmar por ella');
    /* el otro lado del contrato: el tope de horas que el formulario ofreció con ese mismo nivel */
    PRUEBAS.igual(restDuracionesPara(nivelRiesgoDe('ANA SUAREZ', 'Operaciones', 'Consorcio HELITEC', null)).slice(-1)[0],
      nivelInfo(NIVEL_DEFAULT).maxRestrH,
      '⚠️ y coincide con lo que `restDuracionesPara` ofreció: la fila y la decisión cuentan la misma historia');
  } finally { DASH = prev; nivelCacheClear(); }
});

PRUEBAS.caso('DISCRIMINADOR · con la tabla leída (aunque venga vacía) NO se marca «sin confirmar»', () => {
  /* «Esta empresa no declara niveles» es una RESOLUCIÓN: el default es el criterio elegido, no un
     relleno. Sin este caso, marcar `sinNiveles` siempre pasaría igual. */
  const prev = DASH;
  try {
    DASH = { vista: 'supervisor', f: { emp: 'Consorcio HELITEC' }, registros: [], _niveles: [], _nivelesError: false };
    nivelCacheClear();
    const u = bitUmbralDe('ANA SUAREZ');
    PRUEBAS.igual(u.nivel, NIVEL_DEFAULT, 'se juzga con el default');
    /* ⚠️ `=== false` y no `!('sinNiveles' in u)`: la clave se escribe SIEMPRE, también cuando está
       confirmado, para que su AUSENCIA signifique «fila de una app anterior a 6.91». Tres estados. */
    PRUEBAS.igual(u.sinNiveles, false, 'DISCRIMINADOR · la fila dice que SÍ estaba confirmado, no se queda callada');
  } finally { DASH = prev; nivelCacheClear(); }
});

PRUEBAS.caso('🔴 y el reintento de niveles alcanza al MÉDICO y a DIRECCIÓN, que son quienes firman', () => {
  /* ⚠️ OTRO ARREGLO CORREGIDO. La primera versión colgaba el reintento del refresco del panel, y el
     verificador mostró que ahí no llega: el auto-refresco es DIARIO (cuota del endpoint) y el único
     tick de 60 s es el de `cicloTick`, que exige la sección Ciclo en pantalla — o sea sólo el
     supervisor. El médico no tiene esa pestaña y `cicloTickStart` ni arranca para Dirección: las dos
     vistas que firman determinaciones se quedaban sin reintento, con el umbral yendo a una hoja que
     no se corrige nunca. Ahora el reintento tiene reloj propio y no depende de ninguna pestaña. */
  const prev = DASH;
  try {
    ['medico', 'hseq', 'supervisor'].forEach(v => {
      dashNivelesFrenar();
      DASH = { vista: v, demoMode: false, params: { usuario: 'u', pass: 'x' }, _niveles: null,
               _nivelesError: true, _nivelesPedidos: true, _nivelesIntentos: 0 };
      dashNivelesReintentoTarde(DASH);
      PRUEBAS.cierto(!!_nivelesReintentoT, '🔴 ' + v + ': queda armado el reintento, sin depender de ninguna pestaña');
      PRUEBAS.igual(DASH._nivelesIntentos, 1, 'y cuenta el intento');
    });
    /* DISCRIMINADOR · al empleado ni se le arma: el filtro por vista tiene que estar ACÁ y no sólo
       en el disparo, o queda un temporizador que al vencer no hace nada. Medido en el navegador. */
    dashNivelesFrenar();
    DASH = { vista: 'empleado', demoMode: false, params: { usuario: 'u', pass: 'x' }, _niveles: null,
             _nivelesError: true, _nivelesPedidos: true, _nivelesIntentos: 0 };
    dashNivelesReintentoTarde(DASH);
    PRUEBAS.falso(!!_nivelesReintentoT, 'DISCRIMINADOR · al empleado no se le arma ningún temporizador');
    /* DISCRIMINADOR · no insiste para siempre: dos y para.
       ⚠️ CON `vista:'empleado'` ESTO NO MEDÍA EL TOPE: `dashNivelesReintentoTarde` sale por la guarda
       del empleado ANTES de llegar al `if (n > NIVELES_REINTENTOS_MAX)`, así que el caso pasaba por
       la razón equivocada y habría seguido verde con el tope borrado. Lo cazó el verificador. */
    dashNivelesFrenar();
    DASH = { vista: 'supervisor', demoMode: false, params: { usuario: 'u', pass: 'x' }, _niveles: null,
             _nivelesError: true, _nivelesPedidos: true, _nivelesIntentos: NIVELES_REINTENTOS_MAX };
    dashNivelesReintentoTarde(DASH);
    PRUEBAS.falso(!!_nivelesReintentoT, 'DISCRIMINADOR · pasados los dos reintentos no arma otro: un endpoint caído no merece un POST por minuto todo el turno');
    /* y con uno menos SÍ lo arma — si no, lo de arriba pasaría por cualquier motivo */
    dashNivelesFrenar();
    DASH._nivelesIntentos = NIVELES_REINTENTOS_MAX - 1;
    dashNivelesReintentoTarde(DASH);
    PRUEBAS.cierto(!!_nivelesReintentoT, '⚠️ y con un intento menos sí: el tope es lo que decide, no otra guarda');
    /* y un panel que ya no es el mismo no dispara nada (candado de P185) */
    dashNivelesFrenar();
    const otro = DASH; DASH = { vista: 'medico', _nivelesError: true };
    dashNivelesReintentoTarde(otro);
    PRUEBAS.falso(!!_nivelesReintentoT, '⚠️ y si el visor cambió de panel, el reintento del anterior no pide nada de la empresa nueva');
  } finally { dashNivelesFrenar(); DASH = prev; }
});

/* ══ 3 · el historial de informes ═══════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 si el historial de informes falla, el panel no afirma «todavía no hay informes»', () => {
  const prev = DASH;
  try {
    DASH = { vista: 'supervisor', rol: 'supervisor', f: { emp: '', dep: '', per: '' }, scope: '',
             _informes: [], _informesLoaded: true, _informesLoading: false, _informesError: true, demoMode: false };
    const html = renderInforme([]);
    PRUEBAS.falso(html.indexOf(t('inf_hist_vacio')) >= 0, '🔴 no puede decir que no hay informes: no los pudo leer');
    PRUEBAS.cierto(html.indexOf(t('inf_hist_error')) >= 0, 'dice que no se pudo traer el historial');
    DASH._informesError = false;
    PRUEBAS.cierto(renderInforme([]).indexOf(t('inf_hist_vacio')) >= 0, 'DISCRIMINADOR · sin error, el vacío se sigue diciendo');
  } finally { DASH = prev; }
});

PRUEBAS.caso('y el ↻ vuelve a pedir lo que falló (niveles e informes, que no tenían reintento)', () => {
  const prev = DASH, oNiv = window.dashCargarNiveles, oInf = window.dashLoadInformes;
  let niv = 0, inf = 0;
  try {
    window.dashCargarNiveles = () => { niv++; };
    window.dashLoadInformes = () => { inf++; };
    DASH = { vista: 'supervisor', demoMode: false, params: { usuario: 'u', pass: 'x' },
             _reportes: [], _opiniones: [], _bitBajada: true,
             _niveles: null, _nivelesError: true, _informesError: true };
    DASH._nivelesIntentos = 99;   // ya se gastaron los reintentos automáticos
    dashReintentarNiveles(true); dashRecargarPendientes();
    PRUEBAS.igual(niv, 1, '🔴 los niveles se vuelven a pedir: antes `_nivelesPedidos` quedaba en true para toda la sesión');
    PRUEBAS.igual(DASH._nivelesIntentos, 0, '⚠️ y el ↻ NO tiene tope: lo pidió una persona, así que se resetea el contador');
    PRUEBAS.igual(inf, 1, 'y el historial de informes también');
    /* DISCRIMINADOR · sin fallo previo no se gasta cuota */
    niv = 0; inf = 0;
    DASH._niveles = []; DASH._nivelesError = false; DASH._informesError = false;
    dashReintentarNiveles(true); dashRecargarPendientes();
    PRUEBAS.igual(niv, 0, 'DISCRIMINADOR · con los niveles ya leídos no se vuelven a pedir');
    PRUEBAS.igual(inf, 0, 'y un historial vacío pero llegado, tampoco');
  } finally { DASH = prev; window.dashCargarNiveles = oNiv; window.dashLoadInformes = oInf; }
});

/* ══ 4 · el historial personal después del alta ═════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 si la recuperación del historial falla, el inicio lo dice y ofrece reintentar', () => {
  /* Antes: el aviso «Estamos trayendo tu historial» desaparecía y quedaba una pantalla vacía sin una
     palabra, justo después de tocar «Cerrar sesión». */
  const oSync = window.misSincronizar, oPerfil = getProfile();
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  window.misSincronizar = () => { _misUltimoSync = 'fallo'; return Promise.resolve(false); };
  misRecuperarHistorial();
  return Promise.resolve().then(() => {}).then(() => {
    PRUEBAS.cierto(_misRecuperarError === true, 'queda marcado que la recuperación falló');
    PRUEBAS.falso(_misRecuperando, 'y que ya no está en curso');
    /* ⚠️ `#inicio`, NO `#sections`: `renderInicio()` escribe en `#inicio`. Con el contenedor
       equivocado el caso daba rojo con el arreglo puesto — mirando una pantalla que no es. */
    const sec = document.getElementById('inicio');
    const txt = (sec && sec.textContent) || '';
    PRUEBAS.cierto(txt.indexOf(t('mis_recuperar_error')) >= 0, '🔴 el inicio lo dice, en vez de quedar mudo');
    PRUEBAS.cierto(txt.indexOf(t('mis_recuperar_reint')) >= 0, 'con el botón para volver a intentar sin cerrar la app');
  }).finally(() => {
    window.misSincronizar = oSync; _misRecuperarError = false; _misUltimoSync = '';
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { renderInicio(); } catch (e) {}
  });
});

PRUEBAS.caso('DISCRIMINADOR · una recuperación que sale bien no deja ningún aviso', () => {
  const oSync = window.misSincronizar, oPerfil = getProfile();
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  /* ⚠️ Resuelve `true`: es el caso que `r.then(fin, fin)` habría leído como «falloDuro». */
  window.misSincronizar = () => { _misUltimoSync = 'ok'; return Promise.resolve(true); };
  misRecuperarHistorial();
  return Promise.resolve().then(() => {}).then(() => {
    PRUEBAS.falso(_misRecuperarError, 'DISCRIMINADOR · el valor resuelto no se confunde con un fallo');
    const sec = document.getElementById('inicio');
    PRUEBAS.falso(((sec && sec.textContent) || '').indexOf(t('mis_recuperar_error')) >= 0, 'y la pantalla no dice nada de un error');
  }).finally(() => {
    window.misSincronizar = oSync; _misRecuperarError = false; _misUltimoSync = '';
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { renderInicio(); } catch (e) {}
  });
});

/* ══ 6 · lo que el propio arreglo rompió, y el verificador cazó ═════════════════════════════════
   Los cuatro de acá abajo no son del hallazgo original: son defectos de la PRIMERA versión de este
   prompt. Van con su caso porque son exactamente el tipo de cosa que vuelve. */

function p208Entrar(vista, extra) {
  /* Camino REAL: `onDashData` con el payload que manda `accionSupervisor` — que NO trae `niveles`.
     Devuelve qué acciones salieron al endpoint. */
  const acciones = [];
  const oPost = window.gestPost, oFetch = window.fetchConReloj, prev = DASH;
  const oLS = localStorage.getItem(K_DASH_CREDS);
  window.gestPost = (p) => { acciones.push(p && p.action); return Promise.resolve({ ok: false }); };
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: false }) });
  const d = Object.assign({ ok: true, rol: vista, vista: vista, sesion: 's1', referencia: { fatiga: 7.3 },
    metricas: ['fatiga'], registros: [], comentarios: null, pvt: [], aptitud: null,
    operacional: [], turnos: [], config: {}, marca: null }, extra || {});
  try { onDashData(d, 'Consorcio HELITEC', { usuario: 'u', empresa: 'Consorcio HELITEC', pass: 'x' }, vista); } catch (e) { acciones.push('EXCEPCION:' + e.message); }
  return new Promise(r => setTimeout(r, 40)).then(() => {
    const dash = DASH;
    /* R18 · `onDashData` deja el auto-refresco armado y (P208) puede dejar un reintento de niveles
       en un `setTimeout` de 30 s: los dos se apagan acá, o se los come la prueba siguiente. */
    try { stopDashAutoRefresh(); } catch (e) {}
    try { dashNivelesFrenar(); } catch (e) {}
    window.gestPost = oPost; window.fetchConReloj = oFetch; DASH = prev;
    if (oLS == null) { try { localStorage.removeItem(K_DASH_CREDS); } catch (e) {} } else localStorage.setItem(K_DASH_CREDS, oLS);
    return { acciones, niveles: dash && dash._niveles, aptPulled: dash && dash._aptPulled };
  });
}

PRUEBAS.caso('🔴 al entrar al panel salen las DOS cargas, y `_niveles` en null prueba que la condición vieja era constante', () => {
  return p208Entrar('medico').then(r => {
    PRUEBAS.cierto(r.acciones.indexOf('niveles_riesgo') >= 0, 'se piden los niveles');
    PRUEBAS.cierto(r.acciones.indexOf('gestiones') >= 0, '🔴 y las gestiones — el pedido que NO salía nunca: el médico entraba a su cola leyendo un almacén vacío');
    PRUEBAS.igual(r.niveles, null, '⚠️ DISCRIMINADOR · `accionSupervisor` no manda `niveles`, así que `!DASH._niveles` era una condición CONSTANTE y la rama de abajo, inalcanzable');
  });
});

PRUEBAS.caso('🔴 y cada carga va GATEADA POR VISTA: el servidor no le contesta lo mismo a todos', () => {
  /* La primera versión del arreglo las pedía para todos. `accionGestiones` responde `sin_permiso` a
     `hseq`, y `accionNivelesRiesgo` rechaza al empleado (`accesoPanel_`): eran dos POST inútiles por
     entrada, que es lo que P187 sacó de este mismo lugar. */
  return p208Entrar('hseq').then(r => {
    PRUEBAS.cierto(r.acciones.indexOf('niveles_riesgo') >= 0, 'Dirección SÍ necesita la escala de niveles para sus agregados');
    PRUEBAS.falso(r.acciones.indexOf('gestiones') >= 0, '⚠️ pero no las gestiones: el servidor le contesta «esta vista no opera sobre personas»');
    return p208Entrar('empleado');
  }).then(r => {
    PRUEBAS.falso(r.acciones.indexOf('niveles_riesgo') >= 0, '⚠️ y al empleado no se le piden los niveles: su `pass` es el token de persona, no una credencial de panel');
    PRUEBAS.falso(r.acciones.indexOf('gestiones') >= 0, 'ni las gestiones');
  });
});

PRUEBAS.caso('🔴 el supervisor no pide `gestiones` DOS veces (`renderAptitud` dispara el suyo desde adentro del render)', () => {
  return p208Entrar('supervisor').then(r => {
    const n = r.acciones.filter(a => a === 'gestiones').length;
    PRUEBAS.igual(n, 1, '🔴 un solo pedido · salieron: ' + r.acciones.join(', '));
    PRUEBAS.cierto(r.aptPulled === true, 'porque `onDashData` marca `_aptPulled`: el pull de la pestaña Aptitud ES éste, no uno nuevo');
  });
});

PRUEBAS.caso('🔴 mientras la tabla de niveles VIAJA, el chip y el aviso dicen lo mismo (tres estados, no dos)', () => {
  /* La primera versión usaba dos condiciones distintas para el mismo hecho: el chip miraba
     `Array.isArray(_niveles)` y el aviso `_nivelesError`. En los 2-4 s del pedido los dos daban
     falso, así que la ficha decía «Nivel sin confirmar» sin una palabra de por qué. */
  const prev = DASH;
  try {
    const base = { vista: 'medico', demoMode: false, f: { emp: 'Consorcio HELITEC' }, registros: [] };
    DASH = Object.assign({}, base, { _nivelesPedidos: true, _niveles: null, _nivelesError: false });
    PRUEBAS.igual(nivelesEstado(), 'viajando', 'con el pedido en vuelo el estado es «viajando»');
    PRUEBAS.cierto(nivelesAvisoHtml().indexOf(t('niv_cargando')) >= 0, '🔴 y la pantalla lo DICE, en vez de mostrar «Nivel sin confirmar» a secas');
    DASH = Object.assign({}, base, { _nivelesPedidos: true, _niveles: null, _nivelesError: true });
    PRUEBAS.igual(nivelesEstado(), 'error', 'si falló, «error»');
    PRUEBAS.cierto(nivelesAvisoHtml().indexOf(t('av_no_pudimos')) >= 0, 'con el aviso y el ↻');
    DASH = Object.assign({}, base, { _nivelesPedidos: true, _niveles: [], _nivelesError: false });
    PRUEBAS.igual(nivelesEstado(), 'ok', 'DISCRIMINADOR · una lista vacía es una RESPUESTA: estado ok');
    PRUEBAS.igual(nivelesAvisoHtml(), '', 'y no se muestra ningún aviso');
    DASH = Object.assign({}, base, { vista: 'empleado', _nivelesPedidos: false, _niveles: null, _nivelesError: true });
    PRUEBAS.igual(nivelesEstado(), 'ok', 'y en la vista del empleado nunca hay aviso: no los pide ni los usa');
  } finally { DASH = prev; }
});

PRUEBAS.caso('🔴 tocar «Volver a intentar» dos veces no deja la pantalla vacía y muda', () => {
  /* ⚠️ ESTE CASO SE REESCRIBIÓ, y el motivo vale más que el caso. La primera versión stubeaba
     `misSincronizar` con un guard propio que devolvía `Promise.resolve(false)` — o sea, simulaba el
     comportamiento VIEJO— así que medía contra una pieza que contradecía el arreglo. Ahora entra por
     el camino real: `misSincronizar` de verdad, con la RED stubeada, que es el único eslabón que la
     prueba tiene derecho a reemplazar (R17).
     El defecto: el segundo toque recibía `false` al instante y SIN motivo, `fin()` apagaba las dos
     banderas, y quedaba la pantalla vacía y muda — el estado exacto que este prompt viene a
     eliminar, alcanzable con el botón que este prompt agrega. */
  const oPerfil = getProfile(), oFetch = window.fetchConReloj, oSes = window.sesPersonaToken;
  const prevLS = {}; try { Object.keys(localStorage).forEach(k => { prevLS[k] = localStorage.getItem(k); }); } catch (e) {}
  try { localStorage.clear(); } catch (e) {}
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  window.sesPersonaToken = () => 'tok';
  let pedidos = 0, soltar = null;
  window.fetchConReloj = () => { pedidos++; return new Promise(r => { soltar = () => r({ json: () => Promise.resolve({ ok: false, error: 'servidor caído' }) }); }); };
  misRecuperarHistorial();            // toque 1: sale el pedido
  misRecuperarHistorial();            // toque 2: se engancha al mismo
  return new Promise(r => setTimeout(r, 20)).then(() => {
    PRUEBAS.igual(pedidos, 1, '⚠️ un solo pedido a la red: el segundo toque no manda otro');
    PRUEBAS.cierto(_misRecuperando, '🔴 y no apaga el «Estamos trayendo tu historial» del primero');
    const cont = document.getElementById('inicio');
    const txt = (cont && cont.textContent) || '';
    PRUEBAS.cierto(txt.indexOf(t('mis_recuperando')) >= 0,
      '🔴 la pantalla nunca queda vacía Y muda: sigue diciendo que está trayendo el historial');
    if (soltar) soltar();
    return new Promise(r => setTimeout(r, 30));
  }).then(() => {
    PRUEBAS.falso(_misRecuperando, 'cuando el pedido vuelve, se apaga el cartel de espera');
    PRUEBAS.cierto(_misRecuperarError === true, 'y como volvió fallado, se dice — con el motivo real, no con el `false` del guard');
    const cont = document.getElementById('inicio');
    PRUEBAS.cierto(((cont && cont.textContent) || '').indexOf(t('mis_recuperar_error')) >= 0, 'en la pantalla');
  }).finally(() => {
    window.fetchConReloj = oFetch; window.sesPersonaToken = oSes;
    _misRecuperarError = false; _misUltimoSync = ''; _misSincronizando = false; _misSincEnVuelo = null;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { renderInicio(); } catch (e) {}
  });
});

PRUEBAS.caso('🔴 y una sincronización que sale bien APAGA el aviso, aunque traiga cero registros', () => {
  /* El caso de alguien recién dado de alta: cero registros es su estado NORMAL. Con el aviso pegado,
     seguía leyendo «no pudimos traer tu historial» después de que el servidor contestara que no hay
     ninguno — una afirmación falsa y permanente hasta recargar la app. Lo cazó el verificador. */
  const oPerfil = getProfile(), oFetch = window.fetchConReloj, oSes = window.sesPersonaToken;
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  window.sesPersonaToken = () => 'tok';
  _misRecuperarError = true;   // vengo de un intento fallido
  /* respuesta buena y VACÍA, por el camino real de `misSincronizar` */
  window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, registros: [], pvt: [] }) });
  return misSincronizar().then(ok => {
    PRUEBAS.cierto(ok === true, '⚠️ la sincronización salió bien (si no, lo de abajo no mediría nada)');
    PRUEBAS.falso(_misRecuperarError, '🔴 y el aviso de «no pudimos traer tu historial» se apaga');
    const cont = document.getElementById('inicio');
    PRUEBAS.falso(((cont && cont.textContent) || '').indexOf(t('mis_recuperar_error')) >= 0,
      'así que la pantalla deja de afirmar algo que el servidor acaba de desmentir');
  }).finally(() => {
    window.fetchConReloj = oFetch; window.sesPersonaToken = oSes;
    _misRecuperarError = false; _misUltimoSync = ''; _misSincronizando = false; _misSincEnVuelo = null;
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { renderInicio(); } catch (e) {}
  });
});

PRUEBAS.caso('🔴 y el segundo toque se ENGANCHA al pedido en vuelo en vez de contestar «false» al instante', () => {
  /* El guard de `misSincronizar` devolvía `Promise.resolve(false)` sin escribir el motivo, así que
     `fin()` apagaba las dos banderas y la pantalla quedaba muda. Ahora devuelve LA MISMA promesa
     —el patrón que P174 ya le aplicó a `tareasCargar`, por lo mismo— y el segundo toque se entera
     de cómo terminó el primero. No manda un pedido más: comparte el que ya está. */
  const oPerfil = getProfile(), oFetch = window.fetchConReloj, oSes = window.sesPersonaToken;
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  window.sesPersonaToken = () => 'tok';
  let pedidos = 0, soltar = null;
  window.fetchConReloj = () => { pedidos++; return new Promise(r => { soltar = () => r({ json: () => Promise.resolve({ ok: false, error: 'servidor caído' }) }); }); };
  const a = misSincronizar();
  const b = misSincronizar();
  PRUEBAS.igual(pedidos, 1, '⚠️ un solo pedido a la red, que es lo que el candado protege');
  PRUEBAS.cierto(a === b, '🔴 y las dos llamadas devuelven LA MISMA promesa: la segunda no contesta «false» al instante');
  if (soltar) soltar();
  return a.then(() => {
    PRUEBAS.igual(_misUltimoSync, 'fallo', 'y cuando vuelve, las dos se enteran del motivo real');
  }).finally(() => {
    window.fetchConReloj = oFetch; window.sesPersonaToken = oSes;
    _misRecuperarError = false; _misUltimoSync = ''; _misSincronizando = false; _misSincEnVuelo = null;
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { renderInicio(); } catch (e) {}
  });
});

PRUEBAS.caso('🔴 «Ver todo el historial» NO se come el pedido de 400 días por compartir uno de 30', () => {
  /* ⚠️ ESTA ES LA REGRESIÓN MÁS CARA DE TODO EL PROMPT, y la introdujo un arreglo mío. Compartir la
     promesa en vuelo arregla el doble toque de «Volver a intentar», pero si el que viaja pide MENOS
     días que el que llega, el segundo recibe un `true` que no le corresponde: `cicloMiHistorialTodo`
     lo lee como «llegaron los 400 días», deja `_cicloHistDias = 400`, y con eso el botón deja de
     pintarse. La persona ve los mismos 30 días, sin un mensaje, y no puede volver a pedir el año
     sin recargar la app. Encima mata el bucle de reintento de P187, que vive en la rama `!ok`.
     Los tres casos que tocan este camino estubean `misSincronizar`, así que ninguno lo podía ver. */
  const oPerfil = getProfile(), oFetch = window.fetchConReloj, oSes = window.sesPersonaToken;
  setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
  window.sesPersonaToken = () => 'tok';
  const urls = []; let soltar = null;
  window.fetchConReloj = (u) => { urls.push(String(u)); return new Promise(r => { soltar = () => r({ json: () => Promise.resolve({ ok: true, registros: [], pvt: [] }) }); }); };
  const arranque = misSincronizar();       // el del arranque: 30 días (sin `dias`)
  const todo = misSincronizar(400);        // «Ver todo el historial», con el otro en vuelo
  PRUEBAS.cierto(arranque !== todo, '🔴 NO comparte: el que viaja trae menos días de los que éste pide');
  return todo.then(ok => {
    PRUEBAS.falso(ok, '🔴 y contesta `false`, que es lo que dispara el bucle de reintento de P187 — no un `true` prestado');
    PRUEBAS.igual(urls.length, 1, 'sin mandar un segundo pedido mientras el primero viaja');
    PRUEBAS.falso(urls[0].indexOf('dias=400') >= 0, '⚠️ y el que viaja es el de 30, que es el punto: sus datos no son los que se pidieron');
    if (soltar) soltar();
    return arranque;
  }).then(() => {
    /* DISCRIMINADOR · al revés SÍ comparte: si el que viaja pide 400, uno que pide 30 ya está servido */
    const largo = misSincronizar(400);
    const corto = misSincronizar();
    PRUEBAS.cierto(largo === corto, 'DISCRIMINADOR · si el que viaja trae MÁS días, el segundo se engancha (que es el arreglo del doble toque)');
    /* ⚠️ Y EL BORDE DEL `<=`, que es el único lugar donde se distingue de `<`: dos toques seguidos
       de «Ver todo el historial» piden LO MISMO, así que el segundo tiene que engancharse. Sin esta
       línea, degradar el operador a `<` dejaba la suite en verde y mandaba un segundo POST de 400
       días por cada toque. Lo cazó el verificador. */
    PRUEBAS.cierto(misSincronizar(400) === largo, '⚠️ el mismo rango se comparte: dos toques de «Ver todo el historial» no son dos pedidos');
    if (soltar) soltar();
    return largo;
  }).finally(() => {
    window.fetchConReloj = oFetch; window.sesPersonaToken = oSes;
    _misSincronizando = false; _misSincEnVuelo = null; _misSincDias = 0;
    _misRecuperarError = false; _misUltimoSync = '';
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { renderInicio(); } catch (e) {}
  });
});
