/* ═══════════════════════════════════════════════════════════════
   Silva Salud Fatiga — Service Worker
   ▸ SUBÍ ESTE NÚMERO CADA VEZ QUE ACTUALICES LA APP  ◂
   (debe coincidir conceptualmente con APP_VERSION del index.html)
   ═══════════════════════════════════════════════════════════════ */
const VERSION = 'v478';
const CACHE = 'silva-fatiga-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  /* ⚠️ El SVG de Escudo 360 va al caché igual que el PNG: si no está, la app instalada abre sin
     logo cuando no hay señal — y el logo es lo primero que se ve. El `logo.png` se queda porque
     lo sigue usando la pantalla de pre-arranque (pedido de Franco: ése no se toca). */
  './escudo360.svg',
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
  /* ⚠️ P191 · `cache: 'reload'` PARA LA APP (`./` y `./index.html`), y esto es lo que evitaba una tercera recarga
     con vuelta atrás. `addAll` pide con el modo de caché por defecto, y el hosting responde `cache-control:
     max-age=600`: el caché HTTP del navegador podía entregar el `index.html` VIEJO al worker nuevo (el
     `fetch(no-store)` de la revalidación no alimenta ese caché). Entonces el caché nuevo nacía con la app vieja: la
     recarga que sigue al `controllerchange` servía la vieja, la revalidación avisaba «versión nueva» y venía otra
     recarga más. Con `reload` se pide siempre a la red y de paso se actualiza el caché HTTP. Los íconos, el logo y
     el manifest siguen como antes (verificador: con señal débil, un asset que no responda hace fallar `addAll`
     entero, y en la PRIMERA instalación eso deja sin caché offline; la app es lo único que puede cambiar). */
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: /index\.html$|\/$/.test(a) ? 'reload' : 'default' })))).then(() => self.skipWaiting())
  );
});

/* P191 · la app pregunta, al cambiar de controlador, qué `APP_VERSION` tiene ESTE worker en su caché. Si es la
   misma que ya tiene cargada, no recarga: antes el flujo normal era mensaje `version-nueva` → recarga (ya nueva)
   → el `sw.js` nuevo se instala → `controllerchange` → SEGUNDA recarga de una app que ya era la nueva. Se contesta
   por el puerto que manda la app (MessageChannel), no por `postMessage` a todos los clientes, para que la respuesta
   llegue a quien preguntó y sólo a él. */
self.addEventListener('message', event => {
  if (!event.data || event.data.tipo !== 'version?' || !event.ports || !event.ports[0]) return;
  const puerto = event.ports[0];
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.match('./index.html'))
      .then(r => r ? r.text() : '')
      .then(txt => { puerto.postMessage({ tipo: 'version', app: swAppVersionDe(txt) }); })
      .catch(() => { puerto.postMessage({ tipo: 'version', app: null }); })
  );
});
/* Lee `APP_VERSION` del texto del index. La forma exacta (`const APP_VERSION = '6.69';`) la vigila la suite
   (`p191-textos-y-recarga.js`, contrato sw ↔ index): si alguien la cambia, falla ahí y no en producción. */
function swAppVersionDe(txt) {
  const m = /const APP_VERSION = '([0-9][0-9.]*)'/.exec(String(txt || ''));
  return m ? m[1] : null;
}

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
    /* ⚠️ CACHÉ PRIMERO, RED DETRÁS — y este cambio es el que de verdad resuelve lo que Franco
       reportó: "se ponía azul el fondo durante unos segundos, vacío, con el link arriba".

       Ese link lo pinta el navegador: cuando se abre una PWA, Chrome muestra el origen del sitio
       mientras la página todavía no pintó nada. No se puede quitar desde la app. Lo único que se
       puede hacer es que la página pinte ANTES, y para eso hay que dejar de esperar a la red.

       Antes esto era red-primero (con un tope de 2,5 s que agregué y no alcanzó): el arranque
       quedaba atado a la latencia del hosting. Ahora se responde con lo cacheado en el acto —
       milisegundos— y la red corre por detrás para dejar la versión nueva lista.

       ⚠️ LA PROMESA QUE NO SE ROMPE: "nunca queda una versión vieja pegada" es el error más caro que
       tuvo este proyecto. Se sostiene por otro lado: la revalidación SIEMPRE corre, guarda la
       versión nueva, y `sw.js` avisa a la app cuando lo que se sirvió no es lo último. La app lo
       muestra y ofrece recargar. O sea: se ve al instante, y si hay algo nuevo se dice — en vez de
       hacer esperar a todos, siempre, por si acaso. */
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);

      /* ⚠️ SE PIDE LA URL PEDIDA, NO SIEMPRE `./index.html`. Antes esto respondía con la app para
         CUALQUIER navegación dentro del scope: abrir `/pruebas/panel.html` en el mismo origen
         devolvía la app en vez del panel, y la suite dejaba de poder correrse hasta desregistrar el
         service worker a mano. Sólo la navegación a la raíz se sirve desde el caché de la app. */
      const url = new URL(event.request.url);
      const esLaApp = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
      if (!esLaApp) {
        return fetch(event.request).catch(() => cache.match(event.request));
      }

      const guardado = await cache.match('./index.html');
      /* ⚠️ EL TEXTO SE LEE ANTES DE ENTREGAR LA RESPUESTA. `respondWith` BLOQUEA el body de lo que
         se devuelve, así que un `guardado.clone()` posterior lanza `Response body is already used`
         — y como el `.catch` de la revalidación se lo tragaba, el `cache.put` no corría NUNCA: el
         caché no se actualizaba y el aviso de versión nueva no se mandaba jamás. O sea que la
         promesa que este bloque declara innegociable ("nunca queda una versión vieja pegada") se
         rompía en silencio, que es la peor forma de romperla. */
      const textoViejo = guardado ? await guardado.clone().text() : null;

      const deLaRed = fetch(event.request, { cache: 'no-store' }).then(async resp => {
        if (resp && resp.ok) {
          const nuevo = await resp.clone().text();
          await cache.put('./index.html', resp.clone());
          /* Sólo se avisa si de verdad cambió. Avisar en cada apertura sería un cartel que se
             aprende a cerrar sin leer, y entonces el día que importe tampoco se va a leer. */
          if (textoViejo && nuevo !== textoViejo) {
            const clientes = await self.clients.matchAll({ type: 'window' });
            clientes.forEach(c => c.postMessage({ tipo: 'version-nueva' }));
          }
        }
        return resp;
      }).catch(() => null);

      /* Primera visita: no hay nada cacheado y no queda otra que esperar a la red. */
      return guardado || (await deLaRed) || fetch(event.request);
    })());
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
