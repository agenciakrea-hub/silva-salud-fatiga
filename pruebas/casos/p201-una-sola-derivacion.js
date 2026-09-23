PRUEBAS.grupo('P201 · el refresco del panel copia lo MISMO que la primera carga (el bug A4, por segunda vez)');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `onDashData` (primera carga) y `dashRefresh` (refresco) armaban `DASH` cada una con su propia
   lista de campos: 28 en una, 15 en la otra. Las dos listas se fueron separando y quedaron **13
   claves que el refresco no copiaba nunca**, así que el panel las mostraba con el valor del PRIMER
   pedido durante todo el turno — y `dashRefresh` corre cada 60 s mientras la pestaña de ciclo esté
   abierta, más cada vez que alguien toca el ↻.

   Es el bug A4 por segunda vez. La primera se comió `duty` y `ausencias`, y costó dos prompts
   enteros entregados con su suite en verde y funciones que del lado del cliente no existían.

   EL SÍNTOMA QUE MÁS IMPORTA NO ES EL QUE SE VE. Cuando el servidor no puede leer la nómina manda
   `nominaError`, y el panel tiene un aviso escrito para eso: «No se pudo leer la nómina, así que la
   cobertura se calcula sobre quienes ya tienen mediciones». Ese campo viajaba y el refresco lo
   tiraba: la pantalla seguía presentando un porcentaje como si fuera contra la nómina completa,
   sin decir que el dato no estaba. El servidor avisaba y la pantalla callaba (R2).

   EL ARREGLO NO ES COPIAR TRECE LÍNEAS MÁS. Eso deja dos listas otra vez, y dentro de seis meses
   vuelven a separarse: es exactamente la forma en que este bug reaparece. Hay **una** función,
   `dashCamposDelServidor(d)`, y las dos la llaman. Este archivo prueba eso, no las trece claves de
   hoy — porque las claves van a cambiar y la propiedad tiene que seguir valiendo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P201_PARAMS = { action:'supervisor', usuario:'u', empresa:'Empresa Uno', pass:'x', dispositivoId:'p201' };

function p201Reg(nombre, kss){
  return { persona: nombre, empresa: 'Empresa Uno', departamento: 'Operaciones', cargo: 'Piloto',
           fecha: todayStr(), kss: kss };
}
/* Un payload con la forma que manda el servidor de verdad. `extra` pisa lo que haga falta. */
function p201Payload(extra){
  return Object.assign({
    ok: true, rol: 'supervisor', vista: 'supervisor', referencia: {}, metricas: ['kss'],
    registros: [p201Reg('Ana Uno', 3)], comentarios: [], pvt: [], aptitud: [], turnos: [],
    ausencias: {}, duty: null, operacional: [], operacionalPeriodo: null,
    config: { sector: 'aviacion' }, marca: null, combinada: false, zonaOp: null,
    nominaTotal: 2, nominaSinDato: [], nominaError: null,
    cicloPlanPersona: { ana: { jornada: 600 } }, cicloPlanPersonaError: null,
    cuentas: null, visor: null, visorError: null, atajosAdmin: null
  }, extra || {});
}

/* Entra por el camino REAL del refresco: `dashRequest` estubeado, `dashRefresh` de verdad. Nada de
   escribir `DASH` a mano (R17) — justamente el atajo que dejó pasar el bug A4 la primera vez. */
function p201Refrescar(payload){
  const o = window.dashRequest;
  window.dashRequest = () => Promise.resolve(payload);
  return dashRefresh(false).finally(() => { window.dashRequest = o; });
}

function p201Entorno(fn){
  const prev = Object.assign({}, localStorage);
  const dashPrev = (typeof DASH !== 'undefined') ? DASH : null;
  return Promise.resolve()
    .then(() => {
      CTX.resetear();
      onDashData(p201Payload(), 'Empresa Uno', P201_PARAMS, 'supervisor');
      return fn();
    })
    .finally(() => {
      /* R18 · en el `.finally()` de la promesa: un `finally` sincrónico corre antes que el `.then`
         y deja el `dashRequest` de este caso puesto para la prueba siguiente. */
      try { DASH = dashPrev; } catch(e){}
      try { localStorage.clear(); Object.keys(prev).forEach(k => localStorage.setItem(k, prev[k])); } catch(e){}
    });
}

/* Lee del `DASH` vivo todas las claves que `dashCamposDelServidor` produce — no una lista escrita a
   mano. Si mañana se agrega un campo a esa función, este caso lo cubre solo. */
function p201Contexto(){
  const molde = dashCamposDelServidor(p201Payload());
  const out = {};
  Object.keys(molde).forEach(k => { out[k] = JSON.stringify(DASH[k]); });
  return out;
}

PRUEBAS.caso('🔴 P201 · el refresco mueve TODOS los campos de contexto, no sólo los de la firma', () => {
  return p201Entorno(() => {
    const antes = p201Contexto();
    PRUEBAS.alMenos(Object.keys(antes).length, 13,
      'guarda: hay al menos trece campos de contexto que medir · la lista sale de la propia función, no escrita acá');
    PRUEBAS.igual(DASH.nominaError, null, 'guarda: arrancamos sin aviso de nómina');

    /* TODO cambiado, incluido lo que el panel usa para decir la verdad sobre la cobertura. */
    const v2 = p201Payload({
      registros: [p201Reg('Ana Uno', 9)],
      config: { sector: 'campo' }, marca: { nombre: 'Marca Nueva' }, combinada: true,
      zonaOp: 'America/Bogota', nominaTotal: 6, nominaSinDato: ['Beto', 'Caro'],
      nominaError: 'No se pudo leer la nómina',
      cicloPlanPersona: { ana: { jornada: 720 } }, cicloPlanPersonaError: 'plan ilegible',
      cuentas: ['x'], visor: { empresa: 'Otra' }, visorError: 'no existe'
    });
    return p201Refrescar(v2).then(() => {
      const despues = p201Contexto();
      /* ⚠️ Se compara contra lo que la función DEBERÍA producir con ese payload, no contra «distinto
         de antes». Con `antes[k] !== despues[k]` un campo que se derivara mal y quedara `undefined`
         contaba como «se movió» —`JSON.stringify(undefined)` no es la cadena `"null"`— así que el
         aserto daba verde con el arreglo bien Y con un campo destruido. Lo cazó el verificador. */
      const esperado = dashCamposDelServidor(v2);
      const mal = Object.keys(esperado).filter(k => despues[k] !== JSON.stringify(esperado[k]));
      PRUEBAS.igual(mal, [],
        '🔴 los campos de contexto valen LO QUE MANDÓ EL SERVIDOR, no el valor del primer pedido ni undefined');
      const congelados = Object.keys(antes).filter(k => antes[k] === despues[k] && k !== 'atajosAdmin');
      PRUEBAS.igual(congelados, [],
        'y ninguno quedó con el valor del primer pedido · antes quedaban trece, todo el turno');
      PRUEBAS.igual(DASH.nominaError, 'No se pudo leer la nómina',
        '🔴 y el aviso de que la nómina no se pudo leer LLEGA · era el peor: el panel mostraba una cobertura como si fuera contra la nómina entera, callando que el dato no estaba (R2)');
      PRUEBAS.igual(DASH.registros[0].kss, 9, 'DISCRIMINADOR · y los registros también se movieron: el refresco de verdad corrió');
    });
  });
});

PRUEBAS.caso('🔴 P201 · UNA sola derivación: las dos funciones llaman a `dashCamposDelServidor`', () => {
  /* Éste es el aserto que de verdad importa y el que sobrevive a que cambien las claves. Copiar
     trece líneas en `dashRefresh` habría hecho pasar el caso de arriba y dejado el problema intacto:
     dos listas que vuelven a separarse. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    PRUEBAS.igual((src.match(/function dashCamposDelServidor\(/g) || []).length, 1,
      'la función existe y está definida una sola vez');
    const llamadas = (src.match(/dashCamposDelServidor\(d\)/g) || []).length;
    PRUEBAS.alMenos(llamadas, 2,
      '🔴 la llaman los dos caminos (primera carga y refresco) · ' + llamadas + ' llamadas');

    /* DISCRIMINADOR · y las claves NO quedaron además escritas a mano en el literal de `onDashData`.
       Si alguien las vuelve a poner ahí, hay dos derivaciones otra vez aunque la función exista. */
    const iDash = src.indexOf('DASH = { rol:d.rol');
    PRUEBAS.alMenos(iDash, 0, 'guarda: el literal de DASH está donde se espera');
    const literal = src.slice(iDash, src.indexOf('rawSig:', iDash));
    ['nominaError', 'nominaTotal', 'cicloPlanPersona', 'visorError', 'zonaOp'].forEach(k => {
      PRUEBAS.igual((literal.match(new RegExp('\\n\\s+' + k + ':', 'g')) || []).length, 0,
        'DISCRIMINADOR · `' + k + '` ya no está escrita a mano en el literal: sale de la función');
    });
  });
});

PRUEBAS.caso('⚠️ P201 · el refresco NO deshace el plan que el supervisor acaba de guardar', () => {
  return p201Entorno(() => {
    /* El supervisor guarda el plan de una persona; el cliente anota lo que CONFIRMÓ el servidor. */
    const mapa = Object.assign({}, DASH.cicloPlanPersona || {});
    mapa['ana'] = { jornada: 900 };
    DASH.cicloPlanPersona = mapa;
    dashLocalRecordar(DASH, 'cicloPlanPersona', 'ana', { jornada: 900 });
    PRUEBAS.igual((DASH.cicloPlanPersona.ana || {}).jornada, 900, 'guarda: el plan nuevo está puesto');

    /* Y el endpoint sirve una copia CACHEADA, que todavía dice 600. Sin la reaplicación, el refresco
       le desharía en pantalla el cambio que acaba de confirmar — peor que no refrescar. */
    return p201Refrescar(p201Payload({ registros: [p201Reg('Ana Uno', 7)] })).then(() => {
      PRUEBAS.igual((DASH.cicloPlanPersona.ana || {}).jornada, 900,
        '⚠️ lo guardado hace un rato sobrevive al refresco con caché vieja (mismo patrón que las ausencias, P189)');
      PRUEBAS.igual(DASH.registros[0].kss, 7, 'guarda: y el refresco sí corrió · si no, esto no probaría nada');

      /* DISCRIMINADOR · sin el registro local, el servidor manda. La protección es acotada y
         temporal, no un candado que deja el dato viejo para siempre. */
      delete DASH._locales;
      return p201Refrescar(p201Payload({ registros: [p201Reg('Ana Uno', 5)], cicloPlanPersona: { ana: { jornada: 480 } } }))
        .then(() => {
          PRUEBAS.igual((DASH.cicloPlanPersona.ana || {}).jornada, 480,
            'DISCRIMINADOR · sin nada guardado en local, el valor del servidor entra');
        });
    });
  });
});

PRUEBAS.caso('⚠️ P201 · con el mismo payload el panel no se repinta · la firma sigue cortando', () => {
  return p201Entorno(() => {
    const igual = p201Payload();
    /* La firma que `dashRefresh` compara, armada igual que él. */
    DASH.rawSig = JSON.stringify(igual.registros) + '|' + JSON.stringify([]) + '|' + JSON.stringify([]) +
                  '|' + JSON.stringify([]) + '|' + JSON.stringify([]) + '|' + JSON.stringify({});
    /* ⚠️ Se espía `renderDash`, que es lo que `dashRefresh` llama de verdad. El primer intento
       espiaba `dashRepintar` —que `dashRefresh` no llama nunca— así que el aserto daba verde con el
       atajo funcionando y también con el atajo borrado: no medía nada. Lo cazó el verificador. */
    let render = 0;
    const o = window.renderDash;
    window.renderDash = () => { render++; };
    return p201Refrescar(igual).then(() => {
      PRUEBAS.igual(render, 0,
        '⚠️ sin cambios de datos ni de contexto no se re-renderiza · el arreglo copia más campos pero NO rompió el atajo que evita que el scroll salte cada minuto');
      /* DISCRIMINADOR · con un payload distinto SÍ se re-renderiza. Sin esto, un cero podría ser un
         espía que no engancha. */
      return p201Refrescar(p201Payload({ registros: [p201Reg('Ana Uno', 8), p201Reg('Beto Dos', 4)] }))
        .then(() => PRUEBAS.alMenos(render, 1, 'DISCRIMINADOR · con datos nuevos sí re-renderiza · el espía engancha'));
    }).finally(() => { window.renderDash = o; });
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE ENCONTRÓ EL VERIFICADOR SOBRE EL PROPIO ARREGLO

   Tres cosas que el primer intento de P201 hizo mal o a medias. Van acá porque son del mismo
   cambio: hacer que el refresco copie más campos abrió estas tres puertas.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P201 · el refresco NO deshace la jornada de EMPRESA que el supervisor acaba de guardar', () => {
  /* La jornada de toda la empresa vive DENTRO de `_cfg`, y el refresco reemplaza ese objeto entero.
     El primer intento protegió `cicloPlanPersona` y dejó ésta afuera — los dos editores están en la
     misma sección, a doce líneas de distancia, y sólo uno sobrevivía. */
  return p201Entorno(() => {
    const plan = JSON.stringify({ jornada: 480 });
    DASH._cfg = Object.assign({}, DASH._cfg || {}, { cicloPlan: plan });
    dashLocalRecordar(DASH, 'cicloPlan', '', plan);
    PRUEBAS.igual((DASH._cfg || {}).cicloPlan, plan, 'guarda: la jornada nueva está puesta');

    /* Un GET que salió ANTES del guardado aterriza después (hasta 120 s, `DASH_TIMEOUT_MS`) y trae
       la foto anterior. Ésa es la causa real, no la caché del endpoint: `leerConfigEmpresa` lee la
       hoja en vivo. */
    return p201Refrescar(p201Payload({ registros: [p201Reg('Ana Uno', 7)],
      config: { sector: 'aviacion', cicloPlan: JSON.stringify({ jornada: 720 }) } })).then(() => {
      PRUEBAS.igual((DASH._cfg || {}).cicloPlan, plan,
        '🔴 la jornada guardada sobrevive · sin esto el panel le devolvía la vieja, y el «antes» que la confirmación R8 muestra después salía de ahí (ADR 009)');
      PRUEBAS.igual(DASH.registros[0].kss, 7, 'guarda: el refresco corrió de verdad');

      /* DISCRIMINADOR · sin registro local, el servidor manda. */
      delete DASH._locales;
      return p201Refrescar(p201Payload({ registros: [p201Reg('Ana Uno', 6)],
        config: { sector: 'aviacion', cicloPlan: JSON.stringify({ jornada: 600 }) } })).then(() => {
        PRUEBAS.igual((DASH._cfg || {}).cicloPlan, JSON.stringify({ jornada: 600 }),
          'DISCRIMINADOR · sin nada guardado en local entra el valor del servidor · la protección es temporal, no un candado');
      });
    });
  });
});

PRUEBAS.caso('🔴 P201 · un cambio SÓLO de contexto repinta: el dato no puede morir en `DASH`', () => {
  /* El corte por `changed` mira la firma de DATOS. En una empresa quieta —nadie se midió, ningún
     evento de ciclo— el contexto entraba en `DASH` y la pantalla no se enteraba, que es justo el
     caso que este prompt vino a arreglar: se rompe la lectura de `Nómina`, llega `nominaError`, y el
     panel seguía mostrando la cobertura de antes. */
  return p201Entorno(() => {
    let render = 0;
    const o = window.renderDash;
    window.renderDash = () => { render++; };
    const mismos = p201Payload({ registros: DASH.registros, nominaError: 'No se pudo leer la nómina', nominaTotal: 0 });
    return p201Refrescar(mismos).then(() => {
      PRUEBAS.igual(DASH.nominaError, 'No se pudo leer la nómina', 'guarda: el aviso llegó a DASH');
      PRUEBAS.alMenos(render, 1,
        '🔴 y la pantalla se repinta aunque los datos no hayan cambiado · si no, el aviso muere en `DASH`');

      /* DISCRIMINADOR · con TODO igual (datos y contexto) no se repinta: el atajo que evita que el
         scroll salte cada minuto sigue puesto. */
      render = 0;
      return p201Refrescar(p201Payload({ registros: DASH.registros, nominaError: 'No se pudo leer la nómina', nominaTotal: 0 }))
        .then(() => PRUEBAS.igual(render, 0,
          'DISCRIMINADOR · con datos Y contexto iguales no se repinta · el arreglo no rompió el atajo'));
    }).finally(() => { window.renderDash = o; });
  });
});

PRUEBAS.caso('⚠️ P201 · el ↻ MANUAL trae la verdad del servidor: no reaplica lo local', () => {
  /* El botón existe para estar seguro. Si otro supervisor cambió el plan desde otro dispositivo,
     reaplicar lo de acá se lo pisaría y el ↻ devolvería lo viejo — el código ya anticipa ese
     escenario en el guardado («otro supervisor pudo guardar entre medio»). */
  return p201Entorno(() => {
    dashLocalRecordar(DASH, 'cicloPlan', '', JSON.stringify({ jornada: 999 }));
    DASH._cfg = Object.assign({}, DASH._cfg || {}, { cicloPlan: JSON.stringify({ jornada: 999 }) });
    const delOtro = JSON.stringify({ jornada: 300 });
    const o = window.dashRequest;
    window.dashRequest = () => Promise.resolve(p201Payload({ registros: [p201Reg('Ana Uno', 2)],
      config: { sector: 'aviacion', cicloPlan: delOtro } }));
    return dashRefresh(true).finally(() => { window.dashRequest = o; }).then(() => {
      PRUEBAS.igual((DASH._cfg || {}).cicloPlan, delOtro,
        '⚠️ con el ↻ manual gana el servidor · el botón que se toca para estar seguro no puede devolver lo viejo');
    });
  });
});
