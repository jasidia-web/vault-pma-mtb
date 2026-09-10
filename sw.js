/*
  Service worker sederhana untuk Vault PWA.
  Tujuannya cuma dua:
  1. Bikin browser mengenali halaman ini sebagai "installable" (syarat Chrome
     untuk memunculkan tombol "Install app" / "Add to Home screen" dengan benar).
  2. Cache file statis (HTML, manifest, ikon) supaya app tetap bisa dibuka
     walau HP sedang offline / tidak ada internet.

  PENTING: Service worker ini TIDAK menyimpan atau menyentuh data vault sama
  sekali. Data vault selalu didekripsi di memori browser saat itu juga
  (lihat index.html) dan tidak pernah lewat sini.
*/

const CACHE_NAME = 'vault-cache-v1';
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

// Cache-first strategy: pakai versi cache dulu kalau ada, kalau tidak baru ambil dari network.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
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
