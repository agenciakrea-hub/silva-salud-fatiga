/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P186g · LA DOBLE ESCRITURA EN `Operacional` (2026-09-16)

   Lo que se vio en producción: dos `salida_casa` con el MISMO `IdEvento` pelado a 80 s (16/09,
   19:08:19Z y 19:09:39Z) y dos a 9 ms (15/09). El upsert por familia no juntó la segunda porque
   los dos pedidos leyeron la hoja antes de que cualquiera escribiera: `conCandado` decía «si no
   se consigue, se escribe igual», y la cola del teléfono mandaba todo lo pendiente EN PARALELO.
   Dos arreglos, uno por capa:
   · servidor: sin candado NO se escribe; se contesta `{ok:false, reintentar:true}` y el teléfono
     lo guarda en su cola y lo reenvía solo (R7). El reintento, ya sin contención, encuentra la
     fila de la familia y la pisa.
   · cliente: `flushPending` manda de a uno (salvo al salir, con `keepalive`).
   Se prueba el CONTRATO: la respuesta que arma el `.gs` REAL con el candado negado es la que el
   cliente real trata como «guardar en la cola y reintentar», no como «retenido».
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P186G_CAB = ['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo',
                   'Evento', 'Test', 'Resultado', 'Plan'];

/* El `.gs` real con un candado que se puede negar. `env.LockService` es lo que el emulador expone. */
function p186gApi(candado) {
  const env = GS.crearEntorno({ 'Operacional': [P186G_CAB.slice()], 'Config Empresa': [['Empresa', 'Clave', 'Valor']] });
  env.LockService = { getScriptLock: () => ({ tryLock: () => candado, waitLock: () => candado, releaseLock: () => {}, hasLock: () => candado }) };
  const api = GS.cargarGs(CTX.gs, env, ['accionOperacionalGuardar', 'obtenerHojaOperacional', 'conCandado']);
  api.__filas = () => env.__libro.getSheetByName('Operacional').getDataRange().getValues().slice(1);
  api.__guardar = (iso) => JSON.parse(api.accionOperacionalGuardar({
    id: 'op_c00000000_2026-09-16_salida_casa', idPrevio: 'op_persona de prueba_2026-09-16_salida_casa',
    fecha: '2026-09-16', hora: iso.slice(11, 16), iso: iso, evento: 'salida_casa',
    persona: 'Persona De Prueba', empresa: 'Empresa De Prueba', departamento: 'Operaciones', cargo: 'Piloto', plan: '{}'
  }).getContent());
  return api;
}

PRUEBAS.caso('🔴 P186g · sin candado, Operacional NO se escribe y el servidor pide reintento', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186gApi(false);
  const r = api.__guardar('2026-09-16T19:08:19.847Z');
  PRUEBAS.igual(r.ok, false, '🔴 contesta ok:false (antes escribía igual)');
  PRUEBAS.igual(r.reintentar, true, 'y marca que se reintenta');
  PRUEBAS.igual(api.__filas().length, 0, '🔴 y la hoja queda SIN la fila: no se appendea a ciegas');
  /* discriminador: con el candado, el mismo pedido escribe */
  const api2 = p186gApi(true);
  PRUEBAS.igual(api2.__guardar('2026-09-16T19:08:19.847Z').ok, true, 'DISCRIMINADOR · con candado escribe');
  PRUEBAS.igual(api2.__filas().length, 1, 'una fila');
});

PRUEBAS.caso('P186g · el caso real del 16/09: dos `salida_casa` a 80 s con candado son UNA fila (la familia pisa)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p186gApi(true);
  api.__guardar('2026-09-16T19:08:19.847Z');
  const r2 = api.__guardar('2026-09-16T19:09:39.565Z');
  PRUEBAS.igual(r2.actualizado, true, 'la segunda pisa a la primera');
  const filas = api.__filas();
  PRUEBAS.igual(filas.length, 1, 'una sola fila');
  PRUEBAS.igual(String(filas[0][2]), '2026-09-16T19:09:39.565Z', 'con el ISO más nuevo');
  PRUEBAS.igual(String(filas[0][3]), 'op_c00000000_2026-09-16_salida_casa', 'y el id pelado (sin sufijo: no es una segunda jornada)');
});

PRUEBAS.caso('🔴 CONTRATO P186g · la respuesta real del .gs con el candado negado va a la cola del teléfono y se reintenta (no se retiene)', async () => {
  /* Se toma el JSON que arma el `.gs` REAL y se lo sirve por `fetch` al `enviarConCola` real. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const cuerpo = p186gApi(false).accionOperacionalGuardar({
    id: 'op_c1_2026-09-16_salida_casa', iso: '2026-09-16T19:08:19.847Z', evento: 'salida_casa', empresa: 'E', fecha: '2026-09-16' }).getContent();
  const url = SHEETS_DASHBOARD_URL + '?action=operacional_guardar&id=op_c1_2026-09-16_salida_casa&p186g=1';
  const prevPend = localStorage.getItem(K_PENDING);
  const o = window.fetch;
  window.fetch = () => Promise.resolve({ ok: true, status: 200, type: 'cors', text: () => Promise.resolve(cuerpo) });
  try {
    setPending([]);
    await enviarConCola(url);
  } finally { window.fetch = o; }
  const q = getPending().filter(x => x && x.url === url);
  PRUEBAS.igual(q.length, 1, '🔴 quedó en la cola');
  PRUEBAS.igual(!!q[0].trabado, false, 'sin retener: se reintenta solo en la próxima vuelta');
  PRUEBAS.cierto(/^rechazo:Ocupado/.test(q[0].motivo || ''), 'con el motivo del servidor · decía «' + q[0].motivo + '»');
  try { if (prevPend == null) localStorage.removeItem(K_PENDING); else localStorage.setItem(K_PENDING, prevPend); } catch (e) {}
});

PRUEBAS.caso('🔴 P186g · la cola manda DE A UNO: nunca dos pedidos en vuelo a la vez', async () => {
  /* Tres registros pendientes; el `fetch` espiado cuenta cuántos hay en vuelo al mismo tiempo. Con el
     `forEach` de antes eran tres; en serie, uno. */
  const prevPend = localStorage.getItem(K_PENDING);
  const o = window.fetch;
  let enVuelo = 0, maximo = 0, orden = [];
  window.fetch = (u) => {
    enVuelo++; maximo = Math.max(maximo, enVuelo); orden.push(String(u).slice(-1));
    return new Promise(res => Promise.resolve().then(() => Promise.resolve()).then(() => {
      enVuelo--;
      res({ ok: true, status: 200, type: 'cors', text: () => Promise.resolve('{"ok":true}') });
    }));
  };
  try {
    setPending([]);
    ['1', '2', '3'].forEach(n => colaGuardar(SHEETS_DASHBOARD_URL + '?action=operacional_guardar&p186g=' + n, 'red'));
    PRUEBAS.igual(getPending().length, 3, 'precondición: tres pendientes');
    await flushPending();
  } finally { window.fetch = o; }
  PRUEBAS.igual(maximo, 1, '🔴 como mucho UNO en vuelo (antes: 3)');
  PRUEBAS.igual(orden, ['1', '2', '3'], 'en el orden de la cola');
  PRUEBAS.igual(getPending().filter(x => /p186g=/.test(x.url)).length, 0, 'y los tres se confirmaron');
  try { if (prevPend == null) localStorage.removeItem(K_PENDING); else localStorage.setItem(K_PENDING, prevPend); } catch (e) {}
});

PRUEBAS.caso('P186g · al salir (keepalive) van todos juntos: no hay tiempo de esperar', async () => {
  const prevPend = localStorage.getItem(K_PENDING);
  const o = window.fetch;
  let maximo = 0, enVuelo = 0;
  window.fetch = () => {
    enVuelo++; maximo = Math.max(maximo, enVuelo);
    return new Promise(res => Promise.resolve().then(() => Promise.resolve()).then(() => {
      enVuelo--; res({ ok: true, status: 200, type: 'cors', text: () => Promise.resolve('{"ok":true}') }); }));
  };
  try {
    setPending([]);
    ['1', '2'].forEach(n => colaGuardar(SHEETS_DASHBOARD_URL + '?action=operacional_guardar&p186gs=' + n, 'red'));
    await flushPending(true);
  } finally { window.fetch = o; }
  PRUEBAS.igual(maximo, 2, 'los dos en vuelo a la vez');
  try { if (prevPend == null) localStorage.removeItem(K_PENDING); else localStorage.setItem(K_PENDING, prevPend); } catch (e) {}
});
