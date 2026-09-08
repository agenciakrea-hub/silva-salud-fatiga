PRUEBAS.grupo('P143 · el retome, y el callejón que abre');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Dos cosas que salieron de revivir `nominaRetomar()`:

   1 · **La escritura sin lector.** `altaProgresoGuardar()` se llama en cuatro puntos del camino
       vivo y de los tres campos que guarda —empresa, código, perfil— sólo se leía el código, para
       prellenar el de la contraseña. El lector de los otros dos era `nominaRetomar()`, que P132
       dejó sin llamador. Acá se vigila que el par escritor/lector siga cerrado: se hace el alta
       real hasta guardar, se cierra, se reabre, y se comprueba que lo guardado se usa.

   2 · **El callejón que el retome vuelve posible.** Un código rechazado por el servidor pintaba
       «el código no es correcto» en la pantalla de la cédula, que no tiene campo de código. Hoy el
       código se valida segundos antes de llegar ahí, así que es casi imposible; con un retome de
       hasta 24 h deja de serlo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p143Estado(fn){
  const prev = { emp:NOM.empresa, per:NOM.persona, ret:NOM._retomando, paso:NOM.paso,
                 cod:NOM.codigo, pide:NOM.pideCodigo, lista:NOM.empresaPorLista, perfil:NOM.perfil };
  const todo = Object.assign({}, localStorage);
  const abierto = nominaEl('nominaOv').classList.contains('show');
  const prevFetch = fetchConReloj;
  return Promise.resolve().then(fn).finally(() => {
    fetchConReloj = prevFetch;
    NOM.empresa=prev.emp; NOM.persona=prev.per; NOM._retomando=prev.ret; NOM.paso=prev.paso;
    NOM.codigo=prev.cod; NOM.pideCodigo=prev.pide; NOM.empresaPorLista=prev.lista; NOM.perfil=prev.perfil;
    try { localStorage.clear(); Object.keys(todo).forEach(k => localStorage.setItem(k, todo[k])); } catch(e){}
    if (!abierto) { try { nominaCerrar(); } catch(e){} }
  });
}

PRUEBAS.caso('🔴 EL PAR CERRADO · lo que el alta guarda es lo que el retome lee', async () => {
  /* R15 · el dato se escribe por el camino real (`nominaResolverCodigo` con el servidor
     contestando) y se lee por el camino real (`nominaAbrir`). Nada armado a mano en el medio:
     si el escritor y el lector dejaran de entenderse, esto se pone rojo. */
  await p143Estado(async () => {
    localStorage.clear();
    nominaAbrir();
    PRUEBAS.igual(NOM.paso, 'codigo', 'guarda: sin nada guardado el alta arranca por el código');
    // La persona escribe su código y el servidor le dice de qué empresa es.
    nominaEl('nomCodigo').value = 'AB12';
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(
      { ok:true, empresa:'Consorcio HELITEC', perfil:{ nombre:'HELITEC', pideCodigo:true } }) });
    nominaCodigoConfirmar();
    await new Promise(r => setTimeout(r, 80));
    PRUEBAS.igual(NOM.paso, 'cedsola', 'guarda: el código resuelto lleva a la cédula');
    // Y acá abandona: cierra la app.
    nominaCerrar();
    NOM.empresa = ''; NOM.codigo = ''; NOM.perfil = null; NOM.paso = '';
    // Vuelve.
    nominaAbrir();
    PRUEBAS.igual(NOM.paso, 'cedsola',
      '⚠️ vuelve a donde estaba · el progreso se guardaba en cuatro puntos y no lo leía nadie');
    PRUEBAS.igual(NOM.empresa, 'Consorcio HELITEC', 'con la empresa que resolvió el servidor');
    PRUEBAS.igual(NOM.codigo, 'AB12', 'y el código, que vuelve a viajar para que el servidor lo revise');
    PRUEBAS.igual(NOM.perfil && NOM.perfil.nombre, 'HELITEC', 'y el perfil de la empresa, para el rótulo');
  });
});

PRUEBAS.caso('🔒 el retome NO es una puerta para saltear el código · el servidor lo revisa igual', async () => {
  /* La queja que abrió el bloque fue «tiene muchas opciones para saltarse el código». Retomar no
     agrega una: el código guardado viaja otra vez en `nomina_confirmar`, la MISMA acción que lo
     valida cuando se escribe a mano. Se mide qué sale por el cable. */
  await p143Estado(async () => {
    localStorage.clear();
    localStorage.setItem(K_ALTA_PROGRESO, JSON.stringify(
      { empresa:'Consorcio HELITEC', codigo:'AB12', persona:'', pideCodigo:true, perfil:null, ts:Date.now() }));
    nominaAbrir();
    let cuerpo = null;
    fetchConReloj = (u, o) => { cuerpo = JSON.parse(o.body); return Promise.resolve(
      { json: () => Promise.resolve({ ok:true, perfil:{} }) }); };
    nominaEl('nomCedulaSola').value = '12345678';
    nominaCedulaBuscar();
    await new Promise(r => setTimeout(r, 80));
    PRUEBAS.igual(cuerpo && cuerpo.action, 'nomina_confirmar', 'guarda: es la acción que valida el código');
    PRUEBAS.igual(cuerpo && cuerpo.codigo, 'AB12',
      '🔒 el código retomado VIAJA · si el servidor lo rechaza, el alta no pasa');
  });
});

PRUEBAS.caso('🔴 un código rechazado devuelve al paso del código, no deja el error en la pantalla de la cédula', async () => {
  await p143Estado(async () => {
    localStorage.clear();
    localStorage.setItem(K_ALTA_PROGRESO, JSON.stringify(
      { empresa:'Consorcio HELITEC', codigo:'VIEJO', persona:'', pideCodigo:true, perfil:null, ts:Date.now() }));
    nominaAbrir();
    PRUEBAS.igual(NOM.paso, 'cedsola', 'guarda: retomó');
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'codigo_invalido' }) });
    nominaEl('nomCedulaSola').value = '12345678';
    nominaCedulaBuscar();
    await new Promise(r => setTimeout(r, 80));
    PRUEBAS.igual(NOM.paso, 'codigo',
      '⚠️ vuelve al paso del código · antes leía «el código no es correcto» en una pantalla sin campo de código');
    PRUEBAS.cierto(nominaEl('nomCodErr').textContent.length > 5, 'y el motivo se pinta ahí, donde puede corregirlo');
    PRUEBAS.igual(nominaEl('nomCodigo').value, '',
      'con el campo VACÍO · reofrecer el que acaban de rechazar sólo sirve para reenviarlo');
    PRUEBAS.igual(NOM.codigo, '', 'y el código malo no queda en memoria');
    // Y no se retoma con el código que ya se sabe malo.
    nominaCerrar(); nominaAbrir();
    PRUEBAS.igual(NOM.paso, 'codigo', '⚠️ ni el próximo arranque lo vuelve a intentar');
  });
});

PRUEBAS.caso('🔒 pero el freno por intentos NO devuelve al código — el discriminador', async () => {
  /* `muchos_intentos` no dice nada sobre el código: mandarla al paso del código sería invitarla a
     gastar los intentos que le quedan. Si este caso se pusiera verde con el de arriba roto, la
     rama nueva estaría atrapando cualquier error. */
  await p143Estado(async () => {
    localStorage.clear();
    localStorage.setItem(K_ALTA_PROGRESO, JSON.stringify(
      { empresa:'Consorcio HELITEC', codigo:'AB12', persona:'', pideCodigo:true, perfil:null, ts:Date.now() }));
    nominaAbrir();
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:false, motivo:'muchos_intentos' }) });
    nominaEl('nomCedulaSola').value = '12345678';
    nominaCedulaBuscar();
    await new Promise(r => setTimeout(r, 80));
    PRUEBAS.igual(NOM.paso, 'cedsola', '🔒 el freno deja a la persona donde estaba');
    PRUEBAS.cierto(nominaEl('nomCedErr').textContent.length > 5, 'con el motivo a la vista');
  });
});
