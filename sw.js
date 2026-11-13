/*
  Service worker sederhana untuk Vault PWA.
  Tujuannya:
  1. Bikin browser mengenali halaman ini sebagai "installable".
  2. Cache file statis supaya app tetap bisa dibuka saat offline.
  3. File HTML & manifest memakai strategi network-first, jadi setelah
     index.html di-deploy ulang (mis. setelah tambah/edit data), perangkat
     langsung mendapat versi terbaru selama ada internet.

  PENTING: Service worker ini TIDAK menyimpan atau menyentuh data vault.
  Data vault didekripsi di memori browser (lihat index.html).
*/

const CACHE_NAME = 'vault-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isAppShell(request) {
  const url = new URL(request.url);
  return (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('manifest.json')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first untuk HTML & manifest: selalu coba versi terbaru, cache sebagai cadangan offline.
  if (isAppShell(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first untuk ikon dan aset statis lain.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
