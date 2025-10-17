const CACHE_NAME = 'inventario-pro-cache-v7.18';
// Archivos del "App Shell" + Librerías CDN
const PRECACHE_ASSETS = [
  '/',
  'index.html',
  'styles.css',
  'script.js',
  'manifest.json',
  'logo.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2', // Recurso de fuente (ejemplo)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2' // Recurso de fuente (ejemplo)
];

// Fase de Instalación: Guardar todos los assets en el caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching App Shell y CDNs');
        // Usamos addAll para las peticiones simples, y peticiones manuales para las que necesitan configuración (como las fuentes)
        const fontAwesomeRequest = new Request('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', {
          mode: 'cors',
          credentials: 'omit'
        });
        
        return Promise.all(
            PRECACHE_ASSETS.map(url => {
                // Las fuentes y CSS de CDNs pueden necesitar modo 'cors'
                if (url.includes('fonts.googleapis') || url.includes('cdnjs.cloudflare') || url.includes('fonts.gstatic')) {
                    return cache.add(new Request(url, { mode: 'cors', credentials: 'omit' }));
                }
                return cache.add(url);
            }).catch(error => {
                console.error('[SW] Error al cachear assets:', error);
            })
        );
      })
      .then(() => self.skipWaiting()) // Activa el SW inmediatamente
  );
});

// Fase de Activación: Limpiar cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Toma control de todas las pestañas abiertas
  );
});

// Fase de Fetch: Interceptar peticiones y servir desde el caché (Cache-First)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // No cachear peticiones que no sean GET (como POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }

  // Estrategia Cache-First para todos nuestros assets precacheados
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Si está en el caché, lo retornamos.
          // console.log('[SW] Sirviendo desde caché:', event.request.url);
          return cachedResponse;
        }

        // Si no está en el caché, vamos a la red
        // console.log('[SW] Sirviendo desde red:', event.request.url);
        return fetch(event.request).then((networkResponse) => {
            // Y guardamos la respuesta en el caché para la próxima vez
            return caches.open(CACHE_NAME).then((cache) => {
              // Solo cacheamos respuestas válidas
              if (networkResponse && networkResponse.status === 200) {
                 cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          })
          .catch(error => {
            // Manejo de error si falla la red y no estaba en caché
            console.error('[SW] Falla de fetch (offline y sin caché):', event.request.url, error);
            // Podríamos retornar una página de "offline" genérica aquí si quisiéramos
          });
      })
  );
});