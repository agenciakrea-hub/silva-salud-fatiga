/* ═══════════════════════════════════════════════════════════════
   Silva Salud Fatiga — Service Worker
   ▸ SUBÍ ESTE NÚMERO CADA VEZ QUE ACTUALICES LA APP  ◂
   (debe coincidir conceptualmente con APP_VERSION del index.html)
   ═══════════════════════════════════════════════════════════════ */
const VERSION = 'v302';
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
    /* ⚠️ CON TOPE DE ESPERA (2026-09-03). La estrategia sigue siendo RED PRIMERO —es la promesa que
       no se negocia acá: "nunca queda una versión vieja pegada" es el error más caro que tuvo este
       proyecto—. Lo que cambia es qué pasa mientras la red no contesta.

       Antes se esperaba a la red sin límite. Como el service worker recién empezó a instalarse (los
       íconos del ASSETS daban 404 y el install fallaba), ese arranque intermediado es NUEVO: con
       señal mala la persona se queda mirando la pantalla azul del sistema —el `background_color`
       del manifest— hasta que la red conteste. Franco lo reportó como "un detalle feo que antes no
       estaba", y tenía razón: antes no había SW que esperar.

       Ahora: si la red no contestó en 2,5 s, se sirve lo cacheado y la respuesta de red, cuando
       llegue, actualiza el caché igual para la próxima apertura. O sea, se pierde como mucho una
       apertura de frescura y se gana un arranque instantáneo en el hangar, que es donde se usa.
       ⚠️ El `fetch` NO se cancela al vencer el tope: se lo deja terminar justamente para que
       actualice el caché. Cancelarlo dejaría la app pegada en la versión vieja para siempre. */
    const alaRed = fetch(event.request, { cache: 'no-store' }).then(resp => {
      caches.open(CACHE).then(c => c.put('./index.html', resp.clone()));
      return resp;
    });
    event.respondWith(
      Promise.race([
        alaRed,
        new Promise(resolve => setTimeout(
          () => resolve(caches.match('./index.html').then(r => r || alaRed)), 2500))
      ]).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
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
