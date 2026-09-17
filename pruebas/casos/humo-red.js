/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P183r · EL CANDADO DE RED DE LA SUITE (2026-09-17)

   Ningún pedido de la suite llega al endpoint REAL. Lo encontró el verificador de P074: un caso
   que entra por `onDashData` con credenciales dispara `gestCanSync()` → cuatro pedidos a
   `SHEETS_DASHBOARD_URL`, el servidor rechaza la contraseña falsa y suma al freno de fuerza bruta
   de esa cuenta (60 fallos en 10 min la frenan). El candado vive en `correr.js` (se instala antes
   de cargar los casos): todo `fetch` a `script.google.com` se corta con una promesa que no se
   resuelve y se cuenta; el reporte y el panel avisan cuántos hubo.
   Acá se prueba el USO (R17): el camino real de la app —`fetchConReloj`, que es por donde salen
   `dashRequest`, `gestPost` y la cola— tiene que pasar por el candado. Y el discriminador: un
   pedido local (el propio `casos.json`) sigue llegando.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

function humoRedEsperar(ms) { return new Promise(r => setTimeout(r, ms)); }
/* «no se resolvió en `ms`»: la promesa cortada no puede ganarle a un timer. */
function humoRedNoResuelve(promesa, ms) {
  return Promise.race([promesa.then(() => 'resolvio', () => 'rechazo'), humoRedEsperar(ms).then(() => 'pendiente')]);
}

PRUEBAS.caso('⚠️ P183r · el candado está puesto y un fetch al endpoint real NO sale (y se cuenta)', async () => {
  PRUEBAS.cierto(!!window.__redCandado && window.fetch === window.__redCandado,
    'guarda: el candado de correr.js está instalado y ES el fetch vigente (un caso anterior lo dejó restaurado)');
  const antes = window.__redCortada.n;
  const r = await humoRedNoResuelve(fetch(SHEETS_DASHBOARD_URL + '?action=version&humo=red'), 400);
  PRUEBAS.igual(r, 'pendiente', '⚠️ el pedido al endpoint real quedó cortado (no resolvió ni rechazó)');
  PRUEBAS.igual(window.__redCortada.n, antes + 1, 'y se contó');
  PRUEBAS.cierto(window.__redCortada.urls.some(u => /humo=red/.test(u)), 'con su URL, sin el host del endpoint · ' + JSON.stringify(window.__redCortada.urls.slice(-1)));
  PRUEBAS.falso(window.__redCortada.urls.some(u => /script\.google\.com/.test(u)), 'la URL anotada no repite el host (queda «<endpoint>»)');
});

PRUEBAS.caso('🔴 P183r · el camino REAL de la app (fetchConReloj → fetch) pasa por el candado', async () => {
  const antes = window.__redCortada.n;
  const r = await humoRedNoResuelve(fetchConReloj(SHEETS_DASHBOARD_URL + '?action=version&humo=reloj', { method: 'GET' }), 400);
  PRUEBAS.igual(r, 'pendiente', '🔴 fetchConReloj al endpoint real queda cortado');
  PRUEBAS.igual(window.__redCortada.n, antes + 1, 'y contado');
  /* y los otros webhooks (los siete tests, el operacional viejo) también son script.google.com */
  const r2 = await humoRedNoResuelve(fetch(SHEETS_DEPRESION_URL + '?nombre=Nadie&humo=1', { mode: 'no-cors' }), 400);
  PRUEBAS.igual(r2, 'pendiente', 'un webhook de test (no-cors) también');
});

PRUEBAS.caso('DISCRIMINADOR P183r · un pedido LOCAL sigue llegando, y no se cuenta', async () => {
  const antes = window.__redCortada.n;
  const r = await humoRedNoResuelve(fetch('/pruebas/casos.json?humo=' + Date.now()), 3000);
  PRUEBAS.igual(r, 'resolvio', 'casos.json responde por el mismo fetch');
  PRUEBAS.igual(window.__redCortada.n, antes, 'y el contador no se mueve');
});

PRUEBAS.caso('P183r · un caso que stubea window.fetch y lo restaura vuelve al candado, no al fetch pelado', async () => {
  const o = window.fetch;
  window.fetch = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
  let vio = null;
  try { vio = await fetch(SHEETS_DASHBOARD_URL + '?humo=stub').then(x => x.status); }
  finally { window.fetch = o; }
  PRUEBAS.igual(vio, 200, 'con el stub puesto, el stub responde (así trabajan los casos)');
  PRUEBAS.cierto(window.fetch === window.__redCandado, 'y al restaurar, el fetch vigente vuelve a ser el candado');
});
