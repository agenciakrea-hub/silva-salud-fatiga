/* ═══════════════════════════════════════════════════════════════
   Silva Salud Fatiga — Service Worker
   ▸ SUBÍ ESTE NÚMERO CADA VEZ QUE ACTUALICES LA APP  ◂
   (debe coincidir conceptualmente con APP_VERSION del index.html)
   ═══════════════════════════════════════════════════════════════ */
const VERSION = 'v294';
const CACHE = 'silva-fatiga-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  /* ⚠️ ESTOS DOS NOMBRES ESTABAN MAL Y ROMPÍAN LA APP ENTERA SIN DECIR NADA (2026-09-03, auditoría).
     Decían `ic192v2.png` / `ic512v2.png`; los archivos del repo son `icon-192.png` / `icon-512.png`
     (manifest.json ya apuntaba bien). Medido contra producción: los dos daban 404.
     `cache.addAll()` RECHAZA ENTERO si cualquier recurso no responde 200. El rechazo viaja por
     `waitUntil` → el evento `install` falla → el worker queda `redundant` → `skipWaiting()` nunca
     corre. Resultado: NINGÚN service worker controlando la página y el caché vacío. O sea que la
     app no tenía caché offline — justo lo que necesita un piloto que abre la app en pista sin
     señal, y lo que todo el diseño "offline primero" da por sentado.
     Y era mudo por construcción: `register()` RESUELVE igual (la registración se crea; lo que falla
     es el install), así que el `.catch` del index nunca se disparaba.
     ⚠️ Si agregás un archivo acá, verificá que exista: un solo 404 apaga el offline completo. */
  './icon-192.png',
  './icon-512.png'
];

// Instala y activa de inmediato la nueva versión
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Borra cachés viejos y toma control sin esperar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('silva-fatiga-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // ── HTML / navegación: SIEMPRE a la red (ignora caché HTTP del browser).
  //    Así nunca queda una versión vieja pegada. Si no hay red, usa el caché.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(resp => {
          caches.open(CACHE).then(c => c.put('./index.html', resp.clone()));
          return resp;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // ── Otros assets: network-first, con fallback a caché (offline).
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
