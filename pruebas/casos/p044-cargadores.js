PRUEBAS.grupo('P044 · el cargador queda centrado con el texto');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Q2 pedía dos cosas para "Confirmar y entrar" (el alta) y "Entrar a…" (portal, supervisor /
   servicio médico): que el cargador quedara centrado con el texto, y que la carga durara un
   MÍNIMO de 2 s aunque el servidor conteste antes.

   MEDIDO ANTES DE TOCAR NADA (en el navegador, con `btnSpin(btn, true, …)` real y
   `getBoundingClientRect()`, no con la regla CSS): el centro del cargador quedaba 8,17 px por
   debajo del centro del texto en `nomBtnConfirmar`, y 8,8 px en el botón del portal — en los DOS
   casos, igual a 375 px y a 1366 px (no es un problema de layout responsivo: es `vertical-align`
   contra la línea de base, que no cambia con el ancho). El arreglo centra con flex en vez de
   ajustar el `vertical-align` a mano, porque un valor en `em` es frágil ante cualquier cambio de
   tipografía y esto no depende de ninguna.

   ⚠️ CÓMO SE PRUEBA EL MÍNIMO DE 2 S (R17): con RELOJ FALSO, nunca con `setTimeout` real. Esta
   pestaña está oculta de forma permanente y Chrome estrangula sus temporizadores — esperar 2 s de
   verdad, por caso, habría dejado la suite entera colgada minutos (ver pruebas/LEEME.md). Se
   entra por las funciones reales (`nominaConfirmar()`, `portalLoginSupervisor(btn)`), con
   `window.fetch` reemplazado por uno que sólo resuelve cuando el caso lo decide — así se controla
   el ORDEN de los dos eventos (¿llegó la respuesta antes o después del mínimo?) sin depender de
   cuánto tarda de verdad nada.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Reloj falso: reemplaza `setTimeout`/`clearTimeout` por una cola que sólo avanza cuando el caso
   lo pide. `avanzar(ms)` dispara, EN ORDEN, todo lo que venza — incluido lo que un callback recién
   disparado vuelva a agendar para el mismo instante (por eso el `while` de abajo: `cargaConMinimo`
   puede reagendar sobre la marcha si la respuesta no llegó). */
function p044RelojFalso(){
  const setTimeoutOriginal = window.setTimeout, clearTimeoutOriginal = window.clearTimeout;
  let ahora = 0, nextId = 1;
  const pendientes = [];
  window.setTimeout = function(fn, ms){
    const id = nextId++;
    pendientes.push({ id: id, fn: fn, cuando: ahora + (ms || 0) });
    return id;
  };
  window.clearTimeout = function(id){
    const i = pendientes.findIndex(p => p.id === id);
    if (i >= 0) pendientes.splice(i, 1);
  };
  return {
    avanzar: function(ms){
      ahora += ms;
      let corrio = true;
      while (corrio){
        corrio = false;
        for (let i = 0; i < pendientes.length; i++){
          if (pendientes[i].cuando <= ahora){
            const p = pendientes.splice(i, 1)[0];
            p.fn();
            corrio = true;
            break;
          }
        }
      }
    },
    restaurar: function(){ window.setTimeout = setTimeoutOriginal; window.clearTimeout = clearTimeoutOriginal; }
  };
}
/* Cede el turno a los `.then` ya resueltos sin usar un temporizador (ver p087Tick, mismo motivo:
   con la pestaña oculta un `setTimeout` corto puede tardar segundos de verdad). */
async function p044Tick(n){ for (let i = 0; i < (n || 10); i++) await Promise.resolve(); }

/* Un `fetch` controlado a mano: no resuelve hasta que el caso llama a `.resolver(payload)`, y
   cuenta cuántas veces se llamó — es el discriminador de "nunca se vuelve a pedir". */
function p044FetchControlado(){
  let resolver, rechazador;
  const promesa = new Promise((res, rej) => { resolver = res; rechazador = rej; });
  const llamadas = [];
  const fn = function(url, opts){
    llamadas.push(String(url));
    return promesa.then(payload => ({ ok:true, status:200, json: () => Promise.resolve(payload) }));
  };
  fn.llamadas = llamadas;
  fn.resolver = function(payload){ resolver(payload); };
  fn.rechazar = function(err){ rechazador(err); };
  return fn;
}

/* Mide el desfase entre el centro del cargador y el centro del texto DENTRO del botón ya cargando.
   Devuelve también los altos medidos, para la guarda de medibilidad: sin eso, un botón invisible
   (0 px) daría un desfase de "0" que parece perfecto y no probaría nada. */
function p044MedirCargador(btn, label){
  if (!btn) return { desfase: null, cargAlto: 0, textoAlto: 0 };
  btnSpin(btn, true, label);
  const carg = btn.querySelector('.cargador');
  let textNode = null;
  for (const n of btn.childNodes){ if (n.nodeType === 3 && n.textContent.trim()) { textNode = n; break; } }
  let out = { desfase: null, cargAlto: 0, textoAlto: 0 };
  if (carg && textNode){
    const rCarg = carg.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rText = range.getBoundingClientRect();
    out = {
      desfase: (rCarg.top + rCarg.height / 2) - (rText.top + rText.height / 2),
      cargAlto: rCarg.height, textoAlto: rText.height
    };
  }
  btnSpin(btn, false);
  return out;
}

PRUEBAS.caso('⚠️ "Confirmar y entrar" (alta): el cargador queda a la altura del texto', () => {
  const ov = document.getElementById('nominaOv');
  const p1 = document.getElementById('nomPaso1'), p3 = document.getElementById('nomPaso3');
  const teniaOv = ov.classList.contains('show');
  const p1Antes = p1.style.display, p3Antes = p3.style.display;
  ov.classList.add('show'); p1.style.display = 'none'; p3.style.display = '';
  let m;
  try { m = p044MedirCargador(document.getElementById('nomBtnConfirmar'), 'Confirmando…'); }
  finally {
    p1.style.display = p1Antes; p3.style.display = p3Antes;
    if (!teniaOv) ov.classList.remove('show');
  }
  // GUARDA DE MEDIBILIDAD: sin alto real no hay nada que comparar — el caso tiene que fallar, no
  // dar verde por casualidad.
  PRUEBAS.alMenos(m.cargAlto, 5, 'el cargador tiene que tener alto real para poder medirlo');
  PRUEBAS.alMenos(m.textoAlto, 5, 'y el texto también, o no hay nada que comparar');
  PRUEBAS.comoMucho(Math.abs(m.desfase), 1.5,
    'centro del cargador contra centro del texto · medido en producción antes del arreglo: 8,17 px · ahora: ' +
    m.desfase.toFixed(2) + ' px');
});

PRUEBAS.caso('⚠️ "Entrar a…" (portal): el cargador queda a la altura del texto', () => {
  const ov = document.getElementById('portalOverlay');
  const gate = document.getElementById('portalGate'), sup = document.getElementById('portalSup');
  const creds = document.getElementById('portalCreds');
  const teniaOv = ov.classList.contains('show');
  const gateAntes = gate.style.display, supAntes = sup.style.display, credsAntes = creds.style.display;
  ov.classList.add('show'); gate.style.display = ''; sup.style.display = '';
  /* ⚠️ GUARDA DE MEDIBILIDAD EN ACCIÓN: la primera corrida de este caso dio cargAlto/textoAlto en
     0 y el caso se puso rojo — CORRECTO, porque `#portalCreds` (el formulario que contiene este
     botón) estaba `display:none`. No es un bug del arreglo: `portalMode()` esconde `#portalCreds`
     cuando `PORTAL_SOLO_DEMO` quedó en `true` de un caso anterior de OTRO archivo de la suite, y
     `#portalSup` visible no alcanza — su hijo sigue oculto. Se fuerza acá, sin depender de esa
     variable global ni de qué corrió antes. */
  creds.style.display = '';
  let m;
  try { m = p044MedirCargador(document.querySelector('#portalSup .save-btn'), 'Entrando…'); }
  finally {
    gate.style.display = gateAntes; sup.style.display = supAntes; creds.style.display = credsAntes;
    if (!teniaOv) ov.classList.remove('show');
  }
  PRUEBAS.alMenos(m.cargAlto, 5, 'el cargador tiene que tener alto real para poder medirlo');
  PRUEBAS.alMenos(m.textoAlto, 5, 'y el texto también, o no hay nada que comparar');
  PRUEBAS.comoMucho(Math.abs(m.desfase), 1.5,
    'centro del cargador contra centro del texto · medido en producción antes del arreglo: 8,8 px · ahora: ' +
    m.desfase.toFixed(2) + ' px');
});

/* ── El mínimo de 2 s: confirmar el alta ─────────────────────────────────────────────────────── */
PRUEBAS.grupo('P044 · confirmar el alta espera el mínimo, y nunca pide dos veces');

/* Deja el alta lista para tocar "Confirmar y entrar", y devuelve todo como estaba pase lo que
   pase — incluido localStorage completo, porque el camino de éxito llama a setProfile/
   sectorRecordar/empresaPerfilGuardar/altaProgresoLimpiar, que tocan varias claves distintas. */
async function p044ConAlta(fn){
  const ov = document.getElementById('nominaOv');
  const p1 = document.getElementById('nomPaso1'), p3 = document.getElementById('nomPaso3');
  const teniaOv = ov.classList.contains('show');
  const p1Antes = p1.style.display, p3Antes = p3.style.display;
  const lsAntes = Object.assign({}, localStorage);
  const nomAntes = { empresa: NOM.empresa, persona: NOM.persona, codigo: NOM.codigo };
  ov.classList.add('show'); p1.style.display = 'none'; p3.style.display = '';
  nominaEl('nomCedula').value = '12345678';
  NOM.empresa = 'Empresa De Prueba'; NOM.persona = 'Persona De Prueba'; NOM.codigo = '';
  const oFetch = window.fetch, oCerrar = window.nominaCerrar, oSetup = window.openSetup;
  const mock = p044FetchControlado();
  const espiado = { cerro: 0, abrioSetup: 0 };
  window.fetch = mock;
  window.nominaCerrar = function(){ espiado.cerro++; };
  window.openSetup = function(){ espiado.abrioSetup++; };
  const reloj = p044RelojFalso();
  try {
    /* ⚠️ `await` ACÁ ES OBLIGATORIO, no cosmético. `fn` es async: sin el `await`, `return fn(...)`
       evalúa la llamada (que corre sólo hasta su primer `await` interno) y el `finally` de ABAJO
       se dispara ahí mismo — restaurando `window.fetch`/`nominaCerrar`/`openSetup` y soltando el
       botón ANTES de que el resto del caso llegue a `reloj.avanzar(...)`. Se me escapó la primera
       vez: los 4 casos de este archivo que usan este helper daban rojo, pero no por el código bajo
       prueba — el propio arnés deshacía sus mocks a mitad de la prueba. */
    return await fn(mock, espiado, reloj);
  } finally {
    reloj.restaurar();
    window.fetch = oFetch; window.nominaCerrar = oCerrar; window.openSetup = oSetup;
    btnSpin(nominaEl('nomBtnConfirmar'), false);
    p1.style.display = p1Antes; p3.style.display = p3Antes;
    if (!teniaOv) ov.classList.remove('show');
    NOM.empresa = nomAntes.empresa; NOM.persona = nomAntes.persona; NOM.codigo = nomAntes.codigo;
    try {
      localStorage.clear();
      Object.keys(lsAntes).forEach(k => localStorage.setItem(k, lsAntes[k]));
    } catch(e){}
    try { paintProfile(); renderSections(); } catch(e){}
  }
}

PRUEBAS.caso('⚠️ si la respuesta llega ANTES del mínimo, el resultado se guarda y se pinta recién a los 2 s', async () => {
  await p044ConAlta(async (mock, esp, reloj) => {
    nominaConfirmar();
    await p044Tick();
    PRUEBAS.igual(mock.llamadas.length, 1, 'un solo pedido al tocar el botón');

    // La respuesta "llega" ya (simula una respuesta pegada a los ~300 ms, mucho antes del mínimo).
    mock.resolver({ ok:true, perfil:{ nombre:'Persona De Prueba', cedula:'12345678', empresa:'Empresa De Prueba' } });
    await p044Tick();
    PRUEBAS.igual(esp.abrioSetup, 0, 'aunque la respuesta YA llegó, todavía no se pintó nada: falta el mínimo');
    PRUEBAS.cierto(nominaEl('nomBtnConfirmar').disabled, 'el botón sigue mostrando que está cargando');

    reloj.avanzar(2000);
    await p044Tick();
    PRUEBAS.igual(esp.abrioSetup, 1, 'al cumplirse el mínimo, se pinta el resultado que YA había llegado');
    PRUEBAS.igual(esp.cerro, 1, 'y se cierra el alta');
    PRUEBAS.igual(mock.llamadas.length, 1,
      '⚠️ discriminador: sigue siendo UN solo pedido — el caso borde del prompt es que NUNCA se vuelve a pedir');
  });
});

PRUEBAS.caso('si la respuesta tarda más que el mínimo, igual pinta al llegar — sin pedir dos veces', async () => {
  await p044ConAlta(async (mock, esp, reloj) => {
    nominaConfirmar();
    await p044Tick();
    PRUEBAS.igual(mock.llamadas.length, 1, 'un solo pedido al tocar el botón');

    reloj.avanzar(2000);
    await p044Tick();
    PRUEBAS.igual(esp.abrioSetup, 0, 'a los 2 s la respuesta todavía no llegó: nada que pintar aún');
    PRUEBAS.igual(mock.llamadas.length, 1, 'y tampoco se reintentó por las suyas al cumplirse el mínimo');

    mock.resolver({ ok:true, perfil:{ nombre:'Persona De Prueba', cedula:'12345678', empresa:'Empresa De Prueba' } });
    await p044Tick();
    PRUEBAS.igual(esp.abrioSetup, 1, 'en cuanto llega, se pinta');
    PRUEBAS.igual(mock.llamadas.length, 1, 'con el mismo único pedido de siempre');
  });
});

/* ── El mínimo de 2 s + el esqueleto: entrar al panel ────────────────────────────────────────── */
PRUEBAS.grupo('P044 · entrar al panel: mínimo, esqueleto, y nunca pide dos veces');

/* ⚠️ POR QUÉ SE REEMPLAZA `onDashData` EN VEZ DE DEJARLO CORRER (R17, con matiz).
   Lo que este archivo prueba es `portalLoginSupervisor`: que espere el mínimo, que pase al
   esqueleto si hace falta, y que nunca repita el pedido. `onDashData` YA tiene sus propias
   pruebas (p098, a4, entre otras) entrando por su propio camino real. Dejarlo correr acá
   encadenaría, además, `gestPull`/`dashCargarReportes`/`casosResumenPull` — pedidos de RED
   propios y legítimos que no tienen nada que ver con Q2 — contra el mismo `fetch` controlado a
   mano, y el conteo de "un solo pedido" dejaría de significar lo que tiene que significar. Se
   espía la función (se ve SI se llamó, CON qué, y CUÁNDO) sin ejecutar su cuerpo. */
async function p044ConPortal(fn){
  const ov = document.getElementById('portalOverlay');
  const gate = document.getElementById('portalGate'), sup = document.getElementById('portalSup');
  const dash = document.getElementById('portalDash');
  const remember = document.getElementById('dashRemember');
  const teniaOv = ov.classList.contains('show');
  const antes = { gate: gate.style.display, sup: sup.style.display, dash: dash.style.display,
                  remember: remember.classList.contains('show'), vista: PORTAL_VISTA };
  ov.classList.add('show'); gate.style.display = ''; sup.style.display = ''; dash.style.display = 'none';
  document.getElementById('pEmpresa').value = 'empresatest';
  document.getElementById('pPass').value = 'clave-de-prueba';
  PORTAL_VISTA = 'supervisor';

  const oFetch = window.fetch, oOnDashData = window.onDashData;
  const mock = p044FetchControlado();
  const espiado = { onDashData: [] };
  window.fetch = mock;
  window.onDashData = function(d, label, params, vista){ espiado.onDashData.push({ d: d, vista: vista }); };
  const reloj = p044RelojFalso();
  const btn = document.querySelector('#portalSup .save-btn');
  try {
    // Mismo motivo que en p044ConAlta: sin `await` el `finally` de abajo restaura los mocks a
    // mitad de la prueba, en cuanto `fn` toca su primer `await` interno.
    return await fn(mock, espiado, reloj, btn);
  } finally {
    reloj.restaurar();
    window.fetch = oFetch; window.onDashData = oOnDashData;
    btnSpin(btn, false);
    cargaBloquear(gate, false);
    gate.style.display = antes.gate; sup.style.display = antes.sup; dash.style.display = antes.dash;
    remember.classList.toggle('show', antes.remember);
    if (!teniaOv) ov.classList.remove('show');
    PORTAL_VISTA = antes.vista;
    document.getElementById('portalErr').textContent = '';
  }
}

PRUEBAS.caso('⚠️ si la respuesta llega ANTES del mínimo, abre derecho — nunca se ve el esqueleto', async () => {
  await p044ConPortal(async (mock, esp, reloj, btn) => {
    portalLoginSupervisor(btn);
    await p044Tick();
    PRUEBAS.igual(mock.llamadas.length, 1, 'un solo pedido al tocar el botón');

    mock.resolver({ ok:true, rol:'supervisor', vista:'supervisor', registros:[{empresa:'Empresa De Prueba'}] });
    await p044Tick();
    PRUEBAS.igual(esp.onDashData.length, 0, 'la respuesta ya llegó, pero todavía no se abrió: falta el mínimo');
    PRUEBAS.igual(document.getElementById('portalDash').style.display, 'none',
      'y el esqueleto NUNCA llegó a mostrarse: no hizo falta, la respuesta fue más rápida que el mínimo');

    reloj.avanzar(2000);
    await p044Tick();
    PRUEBAS.igual(esp.onDashData.length, 1, 'al cumplirse el mínimo, abre con el dato que ya había llegado');
    PRUEBAS.igual(mock.llamadas.length, 1,
      '⚠️ discriminador: sigue siendo UN solo pedido — nunca se volvió a pedir');
  });
});

PRUEBAS.caso('⚠️ si a los 2 s todavía no llegó, aparece el esqueleto del panel — y al llegar pinta sin pedir de nuevo', async () => {
  await p044ConPortal(async (mock, esp, reloj, btn) => {
    portalLoginSupervisor(btn);
    await p044Tick();
    PRUEBAS.igual(mock.llamadas.length, 1, 'un solo pedido al tocar el botón');

    reloj.avanzar(2000);
    await p044Tick();
    PRUEBAS.igual(esp.onDashData.length, 0, 'a los 2 s todavía no hay dato: no se puede abrir con lo que no llegó');
    PRUEBAS.igual(document.getElementById('portalGate').style.display, 'none',
      'se pasó del formulario al panel...');
    PRUEBAS.igual(document.getElementById('portalDash').style.display, '', '...que ya está a la vista');
    const esqueleto = document.getElementById('dashBody').querySelectorAll('.sk-wrap, .dsk-block').length;
    PRUEBAS.alMenos(esqueleto, 1, 'con el esqueleto real adentro, no una pantalla en blanco');
    PRUEBAS.igual(mock.llamadas.length, 1, 'mostrar el esqueleto NO dispara un segundo pedido');

    mock.resolver({ ok:true, rol:'supervisor', vista:'supervisor', registros:[{empresa:'Empresa De Prueba'}] });
    await p044Tick();
    PRUEBAS.igual(esp.onDashData.length, 1, 'en cuanto llega, se pinta encima del esqueleto');
    PRUEBAS.igual(mock.llamadas.length, 1, 'con el mismo único pedido de siempre');
  });
});

PRUEBAS.caso('⚠️ credenciales rechazadas DESPUÉS de abrir el esqueleto: vuelve al formulario, no se queda a medias', () => {
  /* Caso nuevo que introduce este mismo cambio: antes el esqueleto se escribía en un `dashBody`
     que seguía oculto (nunca se veía), así que este cruce no podía pasar. Ahora que el panel se
     abre de verdad a los 2 s, un rechazo de credenciales que llega DESPUÉS tiene que deshacer esa
     apertura — si no, la persona queda mirando un esqueleto que nunca se completa, sin ver el
     aviso de error, que sigue escribiéndose en el formulario que quedó tapado. */
  return p044ConPortal((mock, esp, reloj, btn) => {
    // Vista pedida "médico", pero la contraseña que "contesta" el servidor es de supervisor: el
    // mismo candado de seguridad que ya existía (P044 no lo toca), ahora cruzado con el esqueleto.
    PORTAL_VISTA = 'medico';
    portalLoginSupervisor(btn);
    reloj.avanzar(2000);   // todavía no hay respuesta: se abre el esqueleto
    if (document.getElementById('portalDash').style.display === 'none'){
      throw new Error('el esqueleto no llegó a abrirse; el resto del caso no significaría nada');
    }
    mock.resolver({ ok:true, rol:'supervisor', vista:'supervisor', registros:[{empresa:'Empresa De Prueba'}] });
    return p044Tick().then(() => {
      PRUEBAS.igual(esp.onDashData.length, 0, 'con la vista equivocada, el panel NO se abre con datos ajenos');
      PRUEBAS.igual(document.getElementById('portalDash').style.display, 'none',
        '⚠️ vuelve a esconder el esqueleto que había abierto');
      PRUEBAS.igual(document.getElementById('portalGate').style.display, '',
        'y muestra de nuevo el formulario, que es donde vive el aviso');
      PRUEBAS.cierto((document.getElementById('portalErr').textContent || '').length > 0,
        'con el aviso de credenciales adentro, no en un panel que ya no se ve');
    });
  });
});
