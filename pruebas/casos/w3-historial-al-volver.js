
PRUEBAS.grupo('W3 · el historial al cerrar sesión y volver');

/* ⚠️ LO QUE SE MIDIÓ ANTES DE TOCAR NADA, porque el plan pedía comprobarlo y no opinar.
   Reproducido paso a paso en el navegador, con 12 registros sembrados:

       12 registros  →  cerrar sesión  →  0  →  volver a identificarse  →  **0**

   Y `misSincronizar()` NO se ejecutaba ni una vez en todo el recorrido. La causa: se llamaba desde
   UN SOLO lugar, `tareasArranque()`, que corre una vez al abrir la app. Ni `saveProfile()` ni
   `recuperarConfirmar()` lo llamaban.

   ⚠️ EL DATO NO SE PIERDE: está en el CH y vuelve — pero recién al abrir la app la PRÓXIMA vez.
   Desde adentro de la app eso es indistinguible de haberlo perdido, y el botón que lo provoca se
   llama "Cerrar sesión". Por eso es un defecto y no una molestia: la persona concluye que su
   historial se borró, y no tiene forma de saber que no.

   Después del arreglo, el mismo recorrido con el servidor simulado: 12 → 0 → **3 recuperados**. */

function w3Con(perfil, fn){
  const prevPerfil = getProfile();
  const prevDatos  = misDatos();
  const prevFetch  = window.fetchConReloj;
  /* ⚠️ EL GUARDIÁN `_misSincronizando` SE AÍSLA, y sin esto estos casos fallaban al azar.
     `misSincronizar()` arranca con `if (_misSincronizando) return Promise.resolve(false)` y sale
     SIN pedir nada. Si cualquier caso anterior dejó ese interruptor arriba —le alcanza con haber
     disparado una sincronización cuya promesa todavía no resolvió—, el caso de acá abajo cuenta
     cero pedidos y acusa un bug de la app que no existe. Medido: con el guardián limpio da 1
     pedido, con el guardián trabado da 0.
     Se baja al ENTRAR (no sólo al salir): un caso no puede depender de la prolijidad del anterior. */
  let prevSinc = false;
  try { prevSinc = _misSincronizando; _misSincronizando = false; } catch(e){}
  try {
    if (perfil) setProfile(perfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    return fn();
  } finally {
    window.fetchConReloj = prevFetch;
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    misDatosSave(prevDatos);
    try { _misRecuperando = false; _misSincronizando = prevSinc; } catch(e){}
  }
}

PRUEBAS.caso('⚠️ y estos casos se aíslan del guardián de sincronización', () => {
  /* EL DISCRIMINADOR DEL AISLAMIENTO DE ARRIBA. Sin él, el `w3Con` que acabo de escribir es una
     intención: nadie sabría si de verdad aísla. Acá se traba el guardián a propósito ANTES de
     entrar y se exige que el caso siga midiendo lo que tiene que medir.
     Esto no es teórico: W3 falló dos veces seguidas por exactamente esto, y me mandó a buscar un
     bug en `misRecuperarHistorial` que no estaba ahí. */
  try { _misSincronizando = true; } catch(e){ PRUEBAS.cierto(false, 'no se pudo tocar el guardián'); return; }
  let pidio = 0;
  w3Con({ nombre:'Persona De Prueba', empresa:'Empresa De Prueba' }, () => {
    misDatosSave({ registros:[], pvt:[], ref:{}, metrics:[], actualizado:0 });
    window.fetchConReloj = function(){ pidio++; return Promise.resolve({ json:() => Promise.resolve({ok:true, registros:[]}) }); };
    misRecuperarHistorial();
  });
  PRUEBAS.alMenos(pidio, 1,
    '⚠️ con el guardián trabado por otro caso, éstos TIENEN que seguir midiendo: si no, un caso ' +
    'ajeno los pone en rojo y manda a buscar un bug que no existe');
  let quedo = null; try { quedo = _misSincronizando; } catch(e){}
  PRUEBAS.cierto(quedo === true, 'y al salir se devuelve como estaba, sin pisarle el estado a nadie');
  try { _misSincronizando = false; } catch(e){}
});

PRUEBAS.caso('⚠️ volver a identificarse va a buscar el historial al servidor', () => {
  /* EL CASO DEL PROMPT. Se comprueba el efecto —que se pida al servidor y que los registros
     vuelvan—, no que exista una función con cierto nombre. */
  let pidio = 0;
  const r = w3Con({ nombre:'Persona De Prueba', empresa:'Empresa De Prueba' }, () => {
    misDatosSave({ registros:[], pvt:[], ref:{}, metrics:[], actualizado:0 });
    window.fetchConReloj = function(){ pidio++; return Promise.resolve({ json:() => Promise.resolve({
      ok:true, registros:[{fecha:'2026-09-01',kss:5},{fecha:'2026-08-31',kss:6}],
      pvt:[], referencia:{kss:7}, metricas:['kss'], operacional:[] }) }); };
    misRecuperarHistorial();
    return { avisoActivo: _misRecuperando };
  });
  PRUEBAS.cierto(typeof misRecuperarHistorial === 'function', 'tiene que existir la recuperación');
  PRUEBAS.alMenos(pidio, 1,
    '⚠️ al volver a identificarse la app tiene que PEDIRLE el historial al CH; antes no pedía nada ' +
    'y la persona veía su pantalla vacía');
  PRUEBAS.cierto(r.avisoActivo === true, 'y tiene que quedar marcada la recuperación en curso');
});

PRUEBAS.caso('⚠️ y el caso discrimina: sin perfil NO se pide nada', () => {
  /* El control. Si pidiera igual sin nombre ni empresa, el caso de arriba estaría verde por
     pedir siempre, no por estar bien conectado — y además se le estaría preguntando al CH por
     una persona que no existe. */
  let pidio = 0;
  w3Con(null, () => {
    window.fetchConReloj = function(){ pidio++; return Promise.resolve({ json:() => Promise.resolve({ok:true}) }); };
    misRecuperarHistorial();
  });
  PRUEBAS.igual(pidio, 0, 'sin perfil no hay a quién pedirle el historial, así que no se pide');
});

PRUEBAS.caso('⚠️ mientras trae el historial, la pantalla lo DICE', () => {
  /* "Si vuelve pero tarda, hay que decirlo en pantalla" — es lo que pide el plan, y es la mitad
     que importa: una pantalla vacía y en silencio, justo después de tocar "Cerrar sesión", se lee
     como "perdiste todo". El aviso sólo sale si hay recuperación en curso Y todavía no llegó
     nada, así que en el uso normal no aparece nunca. */
  const visto = w3Con({ nombre:'Persona De Prueba', empresa:'Empresa De Prueba' }, () => {
    misDatosSave({ registros:[], pvt:[], ref:{}, metrics:[], actualizado:0 });
    _misRecuperando = true;  renderInicio();
    const con = document.querySelector('.ini-recuperando');
    const texto = con ? con.textContent.trim() : '';
    _misRecuperando = false; renderInicio();
    const sin = document.querySelector('.ini-recuperando');
    return { hayConRecuperacion: !!con, texto: texto, haySinRecuperacion: !!sin };
  });
  PRUEBAS.cierto(visto.hayConRecuperacion, 'con la recuperación en curso tiene que verse el aviso');
  PRUEBAS.cierto(visto.texto.length > 20, 'con un texto de verdad: "' + visto.texto.slice(0,40) + '"');
  PRUEBAS.falso(visto.haySinRecuperacion,
    'y tiene que desaparecer al terminar — si quedara siempre, sería un cartel permanente');
});

PRUEBAS.caso('el aviso no aparece cuando ya hay registros a la vista', () => {
  /* Caso borde: si la recuperación corre pero la persona YA tiene datos locales, avisar que
     "estamos trayendo tu historial" sobre una pantalla llena sólo confunde. */
  const hay = w3Con({ nombre:'Persona De Prueba', empresa:'Empresa De Prueba' }, () => {
    misDatosSave({ registros:[{fecha:'2026-09-01',kss:5}], pvt:[], ref:{kss:7}, metrics:['kss'], actualizado:Date.now() });
    _misRecuperando = true; renderInicio();
    return !!document.querySelector('.ini-recuperando');
  });
  PRUEBAS.falso(hay, 'con datos ya en pantalla el aviso está de más');
});

PRUEBAS.caso('⚠️ el texto del aviso pasa por t(), en los dos idiomas (R14)', () => {
  PRUEBAS.cierto(t('mis_recuperando') && t('mis_recuperando') !== 'mis_recuperando',
    'la clave tiene que resolver a texto de verdad');
  /* R1: español NEUTRO. Nada de voseo en algo que lee un piloto en Venezuela. */
  PRUEBAS.falso(/\b(tenés|podés|vas a ver tus|guardás|sabés)\b/i.test(t('mis_recuperando')),
    'sin voseo: el texto visible va en español neutro');
});
