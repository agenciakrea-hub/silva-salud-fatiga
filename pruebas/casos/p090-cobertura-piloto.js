PRUEBAS.grupo('P090 · la cobertura del calendario del piloto sale de lo que el servidor DECLARÓ haber mandado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO  (caso 2 del plan de P090)

   En el teléfono del piloto, «hasta dónde hay datos» no es una cuenta que el cliente pueda hacer:
   el servidor recorta el histórico por su cuenta (`opDias`, con un piso duro en `leerOperacional`)
   y lo declara en `operacionalPeriodo`. El calendario tiene que creerle a ESE campo, porque la
   diferencia entre las dos respuestas posibles no es cosmética:

     · «Sin jornada registrada» = esta persona no trabajó ese día.   ← una afirmación
     · «No hay datos cargados de este día» = no pedí ese día.        ← la falta de una afirmación

   Un calendario que dibuje lo segundo como lo primero le está diciendo al médico que alguien no
   trabajó tres semanas cuando lo único que pasó es que el servidor mandó siete días. Con `null`
   —que es lo que hay cuando todavía no llegó ninguna respuesta— el mes ENTERO tiene que salir
   «fuera»; nunca vacío, que se lee como «no hubo nada».

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). NO se escribe `K_CICLO_SRV_PER` a mano para leerlo dos
   líneas después: eso probaría `cmesCobertura` contra un literal escrito por la misma prueba, no
   contra lo que el ÚNICO escritor de esa clave guarda de verdad. Se corre `misSincronizar()` —la
   función que el arranque llama— con la red estubada, y se lee lo que quedó.

   ⚠️ HIGIENE ASÍNCRONA (R18). `misSincronizar` devuelve una promesa, así que el stub se restaura en
   el `.finally()` de ESA promesa y nunca en el `finally` de un bloque `try` sincrónico: el
   sincrónico corre ANTES que el `.then` y deja el `fetch` de esta prueba puesto para la siguiente.
   Ese error ya se cobró cuatro rojos falsos en esta suite.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La respuesta del endpoint por el canal del empleado (`action=empleado`). `operacional: []` a
   propósito: acá no se mide ninguna jornada, se mide el PERÍODO. */
function p090cRespuesta(periodo){
  const d = { ok: true, registros: [], pvt: [], referencia: {}, metricas: [], operacional: [] };
  if (periodo) d.operacionalPeriodo = periodo;
  return d;
}

/* Corre `misSincronizar()` DE VERDAD.
   ⚠️ Se estubea `fetchConReloj`, no `fetch`: es la que usa esta función (y la que le pone el reloj
   de 90 s). Estubear `fetch` dejaría el pedido yéndose al candado de red del arnés y la promesa no
   resolvería nunca.
   Y antes de llamar se apagan las dos guardas que pueden cortarla en silencio y no son parte de lo
   que se prueba: `simulando()` (si otra prueba dejó una simulación abierta) y `_misSincronizando`
   (el arranque de la app dispara su propia sincronización, y si ésa quedó en vuelo la bandera se
   queda en `true` y esta llamada devolvería `false` sin pedir nada). El perfil con nombre y empresa
   lo deja `CTX.resetear()`; `SHEETS_DASHBOARD_URL` es una constante del archivo. */
function p090cSincronizar(respuesta, dias){
  const antes = window.fetchConReloj, simulAntes = SIMUL;
  window.fetchConReloj = function(){
    return Promise.resolve({ ok: true, status: 200,
                             json: function(){ return Promise.resolve(respuesta); } });
  };
  SIMUL = null;
  _misSincronizando = false;
  return misSincronizar(dias).finally(function(){
    window.fetchConReloj = antes;
    SIMUL = simulAntes;
  });
}

/* Lo que esta prueba deja escrito en el localStorage, que es de la app y no de la suite (R18). */
function p090cLimpiar(){
  try { localStorage.removeItem(K_CICLO_SRV_PER); localStorage.removeItem(K_CICLO_SRV); } catch(e){}
}

/* El caso visual de cada casilla del mes, leído de la clase que escribe la app (`cmes-c-<caso>`).
   Ámbito `mio`: la persona es la del perfil, que es lo que `cmesPersonaDe('mio')` resuelve en la
   app real. */
function p090cCasos(ym){
  const div = document.createElement('div');
  div.innerHTML = cmesBloqueHtml('mio', cicloYo(), ym);
  const out = {};
  div.querySelectorAll('.cmes-grid [data-f]').forEach(function(b){
    const m = /cmes-c-([a-z_]+)/.exec(String(b.className || ''));
    out[b.getAttribute('data-f')] = m ? m[1] : '(sin caso)';
  });
  return out;
}

PRUEBAS.caso('🔴 P090 · `operacionalPeriodo` del servidor queda guardado y la cobertura del piloto arranca en hoy − 30', function(){
  CTX.resetear();
  const hoy = todayStr();
  /* Sin argumento: es la llamada del ARRANQUE. Lo que vale no es cuántos días se pidieron sino
     cuántos dice el servidor haber servido — son dos números distintos y el cliente tiene que
     creerle al segundo. */
  return p090cSincronizar(p090cRespuesta({ dias: 30, desde: null, hasta: null, puedeVerHistorico: true }))
    .then(function(ok){
      PRUEBAS.cierto(ok === true,
        'guarda: `misSincronizar` corrió de verdad. Devuelve `false` sin avisar si hay otra sincronización en vuelo, si se está simulando o si falta el perfil — y entonces todo lo de abajo mediría el estado anterior');
      let g = null;
      try { g = JSON.parse(localStorage.getItem(K_CICLO_SRV_PER)); } catch(e){}
      PRUEBAS.igual(g && g.dias, 30,
        'el único escritor de esta clave es `misSincronizar`: si el campo no se guardara, el calendario del piloto no tendría forma de saber hasta dónde hay datos');
      PRUEBAS.igual(g && g.desde, null,
        'por este canal el servidor manda `desde: null` — es el caso normal, no un borde, y es el que obliga a derivar el corte en el cliente');
      const cob = cmesCobertura('mio');
      PRUEBAS.igual(cob && cob.desde, fechaMasDias(hoy, -30),
        'con `desde: null` la cobertura se deriva con `hoy − dias`, que es el mismo corte que hace `leerOperacional` en el servidor');
      PRUEBAS.igual(cob && cob.hasta, hoy,
        'y `hasta: null` es hoy: el servidor manda hasta el día en curso');
    })
    .finally(p090cLimpiar);
});

PRUEBAS.caso('🔴 P090 · DISCRIMINADOR · sin `operacionalPeriodo` la cobertura es NULL y el mes entero sale «fuera», nunca «sin jornada registrada»', function(){
  CTX.resetear();   // limpia también el `K_CICLO_SRV_PER` que dejó el caso anterior
  const hoy = todayStr();
  return p090cSincronizar(p090cRespuesta(null))
    .then(function(ok){
      PRUEBAS.cierto(ok === true, 'guarda: la sincronización corrió; lo único que falta en la respuesta es el período');
      PRUEBAS.igual(localStorage.getItem(K_CICLO_SRV_PER), null,
        'sin el campo no se inventa uno: un endpoint viejo que no lo mande tiene que dejar la cobertura en «no se sabe», no en «0 días»');
      PRUEBAS.igual(cmesCobertura('mio'), null,
        'discriminador: si `cmesCobertura` devolviera algo acá, el caso de arriba podría estar pasando por un default y no por lo que mandó el servidor');
      const cas = p090cCasos(hoy.slice(0, 7));
      const pasados = Object.keys(cas).filter(function(f){ return f <= hoy; });
      PRUEBAS.alMenos(pasados.length, 1,
        'guarda: se midió al menos una casilla ya transcurrida — sin esto las dos afirmaciones de abajo darían verde sobre un conjunto vacío');
      PRUEBAS.igual(pasados.filter(function(f){ return cas[f] !== 'fuera'; }).length, 0,
        'con cobertura desconocida TODO lo transcurrido es «no hay datos cargados de este día»: la app no puede afirmar lo que no sabe (R2)');
      PRUEBAS.igual(Object.keys(cas).filter(function(f){ return cas[f] === 'sin_jornada'; }).length, 0,
        'y ni una sola casilla puede decir «sin jornada registrada»: eso sería acusar a la persona de no haber trabajado con un mes que nadie pidió');
    })
    .finally(p090cLimpiar);
});

PRUEBAS.caso('🔴 P090 · DISCRIMINADOR · con `dias: 7` el corte es hoy − 7, no hoy − 6', function(){
  CTX.resetear();
  const hoy = todayStr();
  return p090cSincronizar(p090cRespuesta({ dias: 7, desde: null, hasta: null, puedeVerHistorico: true }))
    .then(function(ok){
      PRUEBAS.cierto(ok === true, 'guarda: la sincronización corrió de verdad');
      const cob = cmesCobertura('mio');
      PRUEBAS.igual(cob && cob.dias, 7,
        'guarda: el período que se está midiendo es el de 7 días, no el de 30 del caso anterior');
      PRUEBAS.igual(cob && cob.desde, fechaMasDias(hoy, -7),
        'el corte del servidor es `hoy − dias`, no `hoy − (dias − 1)`: se yerra por GENEROSO a propósito. Un día cubierto y vacío dice «sin jornada registrada», que es cierto; uno pedido y marcado «fuera del período» sería falso');
      PRUEBAS.falso(cob && cob.desde === fechaMasDias(hoy, -6),
        'discriminador: es el error de un día que nadie mira. Con `-(dias-1)` el caso de arriba también pasaría si el corte estuviera corrido, porque los dos números existen y los dos parecen razonables');
    })
    .finally(p090cLimpiar);
});
