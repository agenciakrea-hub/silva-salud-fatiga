PRUEBAS.grupo('P223b · la cobertura de la nómina, ahora también para el administrador');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO, Y POR QUÉ EXISTE

   Es la SEGUNDA MITAD de la causa del reporte de Rafael («cargaron información de la empresa y no
   lo veo en la app», 2026-10-03). La primera mitad fue un `|| []` que yo introduje en P214 y que
   dejaba `nominaTotal` en 0 y `nominaSinDato` vacío para la única cuenta administradora. Arreglar
   eso hizo que el payload llegara bien — **y no alcanzó.**

   Porque esos dos campos se consumían ÚNICAMENTE en `renderHseqIdc`, que es de la vista `hseq`.
   El administrador entra con vista `medico` (`onDashData(d, …, 'medico')  // admin = acceso total`)
   y `dashTabsFor` le da `['resumen','comparar','individual','evolucion','comentarios','reportes',
   'informe','gestiones','jornada']` — **sin `idc`**. Medido en el navegador con el payload real:
   `DASH.nominaSinDato` traía los tres nombres y no había ninguna pantalla donde verlos.
   El dato viajaba en la respuesta y se tiraba: el modo de fallar que R17 nombra con `duty` y
   `ausencias`, y que este repo ya pagó dos veces.

   R19 · EL DERECHO QUE SE AFIRMA Y QUIÉN LO CONCEDE: que el administrador vea a quién le falta
   medir lo concede `movCoberturaBloque()`, que se pinta dentro de `movBloque()` y por lo tanto en
   TODAS las vistas que tienen el panel de movimientos (supervisor, médico/admin y Dirección), no
   sólo en la que tiene la pestaña `idc`. Los nombres los recorta el SERVIDOR para Dirección
   (`accionSupervisor` vacía `nomSinDato` cuando `acc.vista === "hseq"`), así que acá no hace falta
   un segundo candado — y este archivo verifica que con la lista vacía el bloque siga siendo
   honesto en vez de mostrar un hueco.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P223B_PARAMS = { action:'supervisor', usuario:'*', empresa:'Alfa', pass:'x', dispositivoId:'p223b' };

function p223bReg(nombre){
  return { persona: nombre, empresa: 'Alfa', departamento: 'Operaciones', cargo: 'Piloto',
           fecha: todayStr(), kss: 3 };
}
/* La forma que manda el servidor de verdad. `extra` pisa lo que haga falta. */
function p223bPayload(extra){
  return Object.assign({
    ok: true, rol: 'admin', vista: 'medico', referencia: {}, metricas: ['kss'],
    registros: [p223bReg('ANA ALFA'), p223bReg('LUIS ALFA')], comentarios: [], pvt: [], aptitud: [],
    turnos: [], ausencias: {}, duty: null, operacional: [], operacionalPeriodo: null,
    config: {}, marca: null, combinada: false, zonaOp: null,
    nominaTotal: 5, nominaSinDato: ['ZOE ALFA', 'BETO ALFA', 'CARO ALFA'], nominaError: null,
    cicloPlanPersona: null, cicloPlanPersonaError: null,
    cuentas: null, visor: null, visorError: null, atajosAdmin: null
  }, extra || {});
}
/* ⚠️ R17 · se entra por `onDashData`, el punto de entrada real, con vista `medico` — que es la que
   usa el administrador. Nada de escribir `DASH` a mano: ese atajo es justo el que dejó pasar este
   defecto, porque con `DASH` armado a mano la pestaña `idc` no entra en la ecuación. */
function p223bEntorno(payload, fn){
  const dashPrev = (typeof DASH !== 'undefined') ? DASH : null;
  const movPrev  = (typeof MOV  !== 'undefined') ? MOV  : null;
  return Promise.resolve()
    .then(() => {
      onDashData(payload, 'Alfa', P223B_PARAMS, 'medico');
      return fn();
    })
    /* R18 · en el `.finally()` de la PROMESA: un `finally` sincrónico corre antes que el `.then` y
       deja el estado de este caso puesto para la prueba siguiente. Ya se cobró cuatro rojos. */
    .finally(() => { try { DASH = dashPrev; MOV = movPrev; } catch(e){} });
}
const P223B_TXT = h => { const d = document.createElement('div'); d.innerHTML = h;
  return d.textContent.replace(/\s+/g, ' ').trim(); };

PRUEBAS.caso('🔴 el ADMINISTRADOR ve cuántos faltan y QUIÉNES, aunque no tenga la pestaña `idc`', () => {
  return p223bEntorno(p223bPayload(), () => {
    /* guarda: éste es el escenario exacto del reporte — el admin NO tiene la pantalla que mostraba
       esto, y el dato SÍ llegó. Si alguna de las dos cosas deja de ser cierta, el caso ya no mide
       lo que dice medir. */
    PRUEBAS.igual(DASH.vista, 'medico', 'guarda: el administrador entra con vista `medico`');
    PRUEBAS.falso((DASH.tabs || []).indexOf('idc') >= 0,
      'guarda: y NO tiene la pestaña `idc`, que es la única que mostraba la cobertura');
    PRUEBAS.igual(DASH.nominaTotal, 5, 'guarda: el payload trajo el total');
    PRUEBAS.igual((DASH.nominaSinDato || []).length, 3, 'guarda: y los tres nombres');

    const h = movCoberturaBloque(), txt = P223B_TXT(h);
    /* ⚠️ SE LEEN LOS ELEMENTOS, NO EL TEXTO CONCATENADO, y esto es el arreglo de un defecto de
       este mismo caso: la primera versión buscaba `\b5\b` en el `textContent` del bloque, que es
       «5en la nómina» — sin espacio entre el número y su etiqueta, así que «5e» no tiene límite de
       palabra y el aserto fallaba con el código bien. Al investigarlo apareció el defecto DE VERDAD:
       un lector de pantalla pronunciaba «5en la nómina». Se arregló el HTML (espacio + `aria-label`)
       y acá se mide por estructura, que es lo que no se rompe al cambiar el texto. */
    const caja = document.createElement('div'); caja.innerHTML = h;
    const cifras = Array.from(caja.querySelectorAll('.mov-cif b')).map(e => e.textContent.trim());
    PRUEBAS.igual(cifras.join('|'), '5|2|3',
      '🔴 las tres cifras: total 5, con pruebas 2 (= 5 − 3), faltan 3 · ' + cifras.join('|'));
    /* Y que el número quede PRONUNCIABLE: sin el espacio el lector de pantalla dice «5en la nómina». */
    const prim = caja.querySelector('.mov-cif');
    PRUEBAS.cierto(/5\s/.test(prim.textContent) || /\s/.test(prim.textContent.charAt(1)),
      '🔴 el número está separado de su etiqueta en el texto, no pegado («5en la nómina»)');
    PRUEBAS.cierto(/^5 /.test(prim.getAttribute('aria-label') || ''),
      '🔴 y tiene `aria-label` con la frase completa · ' + prim.getAttribute('aria-label'));
    ['ZOE ALFA', 'BETO ALFA', 'CARO ALFA'].forEach(n =>
      PRUEBAS.cierto(txt.indexOf(n) >= 0, '🔴 nombra a ' + n + ': el número sin los nombres no es accionable'));
    /* Y va DENTRO del panel, no en una función que nadie llama: es el defecto que este caso
       persigue, así que se exige el camino completo. */
    PRUEBAS.cierto(P223B_TXT(movBloque()).indexOf('ZOE ALFA') >= 0,
      '🔴 y el panel entero lo incluye — `movBloque()` lo pinta, no sólo la función suelta');
  });
});

PRUEBAS.caso('🔴 sin nómina cargada lo DICE, y con todos medidos también', () => {
  /* ⚠️ LOS DOS CASOS BORDE QUE SE VEN IGUAL SI NO SE ESCRIBEN. «0 sin medir» y «no hay nómina»
     producen el mismo bloque de ceros, y un panel que no distingue «todos medidos» de «no sé»
     está afirmando algo que no midió (R2). La memoria `enumerar-los-estados-previos` dice que mi
     arreglo fue peor que el defecto en los tres estados de pantalla que no probé. */
  return p223bEntorno(p223bPayload({ nominaTotal: 0, nominaSinDato: [] }), () => {
    const sin = P223B_TXT(movCoberturaBloque());
    PRUEBAS.cierto(sin.indexOf(t('mov_cob_sin_nomina')) >= 0,
      '🔴 sin nómina: lo dice en vez de mostrar tres ceros · ' + sin.slice(0, 70));
    PRUEBAS.falso(/\bsin medir\b/.test(sin),
      '🔴 y NO afirma «0 sin medir», que sería decir que están todos medidos');
  }).then(() => p223bEntorno(p223bPayload({ nominaTotal: 2, nominaSinDato: [] }), () => {
    const todos = P223B_TXT(movCoberturaBloque());
    PRUEBAS.cierto(todos.indexOf(t('mov_cob_todos')) >= 0,
      '🔴 con todos medidos lo dice: una línea que falta no se distingue de un dato que no llegó · ' + todos.slice(0, 70));
  })).then(() => p223bEntorno(p223bPayload({ nominaError: 'No se pudo leer la nómina' }), () => {
    const err = P223B_TXT(movCoberturaBloque());
    PRUEBAS.cierto(err.indexOf(t('mov_cob_error')) >= 0,
      '🔴 si el servidor avisó que no pudo leer la nómina, se dice (R2): el conteo no es sobre el total');
  })).then(() => p223bEntorno(p223bPayload({ vista: 'hseq', nominaSinDato: [] }), () => {
    /* Dirección: el SERVIDOR ya vació la lista. El bloque tiene que seguir siendo honesto. */
    const d = P223B_TXT(movCoberturaBloque());
    PRUEBAS.cierto(d.length > 0, '🔴 a Dirección el bloque igual le dice algo, no queda en blanco');
    PRUEBAS.falso(/ZOE|BETO|CARO/.test(d),
      '🔴 y sin nombres: los recorta el servidor y el cliente no los inventa');
  }));
});
