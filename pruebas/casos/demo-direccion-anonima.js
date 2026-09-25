PRUEBAS.grupo('Demo · la vista de «Dirección» tiene que verse como Dirección: P1, P2… nunca nombres');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO ENCONTRÓ UNA AUDITORÍA LA NOCHE ANTES DE UNA DEMOSTRACIÓN A UN CLIENTE.

   El cortafuegos K1b dice que Dirección ve agregados, nunca individuos, y en el producto real se
   cumple: `accionSupervisor` pasa los registros por `anonimizarHseq`. Pero la demostración pública
   entra por `action:'demo'` → `accionDemo`, que NO anonimiza, y ahí se pintaba el payload crudo:
   nombre y apellido de cada persona de ejemplo, en la pantalla que existe justamente para mostrar
   que Dirección no los ve.

   ⚠️ Y P200 creyó haberlo cerrado. Agregó el recorte a la rama `p.demo === "1"` de
   `accionSupervisor` —que es otra cosa: un supervisor ya logueado mirando la Empresa Demo— y
   ningún camino del cliente la llama. El defecto siguió vivo durante días con su arreglo escrito al
   lado, y la suite en verde. Este caso entra por el camino que USA la demostración.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ⚠️ La forma de `aptitud` NO se inventa: es la que arma `aptPersonaServer` en el .gs
   (`{nombre, dep, n, metricas:[{m,nivel}], pvt, auto, empeoro, persist, nivel, mrg, dias, viejo,
   ultimaFecha}`). La primera versión de este caso le pasó `{nombre, nivel}` y `aptTarjeta` reventó
   con «p.metricas is undefined» — el caso fallaba por el payload falso, no por el defecto. Con
   `DASH.aptitud` presente, `aptPersona()` NO calcula: devuelve esa fila tal cual (E2a). */
function demoAnonApt(nombre){
  return { nombre: nombre, dep: 'Operaciones', n: 1, metricas: [{ m:'kss', nivel:'ok' }], pvt: null,
           auto: 'ok', empeoro: false, persist: false, nivel: 'medio', mrg: {}, pocoConfiable: 0,
           ultimoPocoConfiable: false, dias: 1, viejo: false, ultimaFecha: '2026-09-20' };
}
function demoAnonPayload(){
  return { ok:true, rol:'supervisor', vista:'hseq', referencia:{}, metricas:['kss'], demo:true,
    registros: [ { persona:'Ana Suárez', cedula:'V-111', departamento:'Operaciones', empresa:'Empresa Demo', kss:5 },
                 { persona:'Beto Pérez', cedula:'V-222', departamento:'Operaciones', empresa:'Empresa Demo', kss:3 } ],
    comentarios: [], pvt: [], turnos: [],
    aptitud: [ demoAnonApt('Ana Suárez'), demoAnonApt('Beto Pérez') ],
    ausencias: {}, duty: null, operacional: [], operacionalPeriodo: null, config: { sector:'aviacion' } };
}

PRUEBAS.caso('🔴 Demo · como Dirección, ningún nombre llega a la pantalla', () => {
  const prev = DASH;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    onDashData(demoAnonPayload(), 'Empresa Demo', { usuario:'demo' }, 'hseq');
    const personas = (DASH.registros || []).map(r => r.persona);
    PRUEBAS.alMenos(personas.length, 2, 'guarda: la demo trae registros · con cero, esto no probaría nada');
    PRUEBAS.igual(personas.filter(p => /Suárez|Pérez/.test(String(p))), [],
      '🔴 ningún nombre real · es la pantalla que existe para mostrar que Dirección no los ve');
    PRUEBAS.cierto(personas.every(p => /^P\d+$/.test(String(p))), 'y todos son opacos · ' + personas.join(', '));
    PRUEBAS.igual((DASH.aptitud || []).filter(a => /Suárez/.test(String(a.nombre))), [], 'tampoco en `aptitud`');
    PRUEBAS.igual((DASH.registros || []).filter(r => r.cedula), [],
      '⚠️ y sin cédula · A13: un identificador fuerte al lado de «P1» deshace el pseudónimo entero');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 Demo · DISCRIMINADOR · el supervisor SÍ ve nombres, y los sigue viendo después de pasar por Dirección', () => {
  const prev = DASH;
  try {
    CTX.resetear();
    localStorage.removeItem('silva_fatiga_bitacora_v1');
    /* El ojo flotante repinta el MISMO payload en cada cambio de vista. Si la anonimización mutara
       los objetos en el lugar —como hizo la primera versión de este arreglo—, la primera visita a
       Dirección dejaría «P1, P2…» grabado y el supervisor los perdería para el resto de la
       demostración. Por eso se va y se vuelve. */
    const payload = demoAnonPayload();
    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'hseq');
    PRUEBAS.cierto((DASH.registros || []).every(r => /^P\d+$/.test(String(r.persona))), 'guarda: Dirección anonimizada');

    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    const sup = (DASH.registros || []).map(r => r.persona);
    PRUEBAS.cierto(sup.some(p => /Suárez/.test(String(p))),
      '🔴 el supervisor ve nombres · si acá salieran «P1, P2» el arreglo habría contaminado el payload guardado y el caso de arriba estaría pasando por la razón equivocada · ' + sup.join(', '));

    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'hseq');
    PRUEBAS.cierto((DASH.registros || []).every(r => /^P\d+$/.test(String(r.persona))),
      'y al volver a Dirección sigue anonimizada');
    onDashData(payload, 'Empresa Demo', { usuario:'demo' }, 'supervisor');
    PRUEBAS.cierto((DASH.registros || []).some(r => /Suárez/.test(String(r.persona))),
      'y el supervisor sigue viendo nombres después de la segunda vuelta');
    PRUEBAS.cierto((DASH.aptitud || []).some(a => /Suárez/.test(String(a.nombre))),
      'también en `aptitud` · `aptPersona()` busca ahí POR NOMBRE: si una punta quedara anonimizada y la otra no, la tarjeta se quedaría sin clasificación en silencio');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('⚠️ Demo · sólo se anonimiza en la demostración, nunca en un panel real', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf("if (vista === 'hseq') demoAnonimizarHseq();");
    PRUEBAS.cierto(i > 0, '⚠️ la llamada existe');
    /* Tiene que estar DENTRO del bloque `if (DASH.demoMode)`: fuera de él le borraría los nombres a
       la Dirección de una empresa real, que los recibe ya recortados del servidor y no necesita esto. */
    const bloque = src.lastIndexOf('if (DASH.demoMode){', i);
    const cierre = src.indexOf("\n  }\n", bloque);
    PRUEBAS.cierto(bloque > 0 && i < cierre,
      '⚠️ y está dentro del bloque de la demostración · fuera de él tocaría paneles reales');
  });
});
