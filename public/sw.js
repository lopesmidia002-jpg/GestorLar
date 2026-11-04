// Service Worker - Gestor Financeiro do Lar PWA (v3 - Self-healing)
const CACHE_NAME = 'gestorlar-cache-v3';

// Ativação e limpeza imediata de todos os caches antigos
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('Removendo cache antigo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Nunca intercepte index.html ou navegação para evitar incompatibilidade de hashes
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Requisições de navegação (HTML): sempre direto da rede
  if (event.request.mode === 'navigate') {
    return;
  }
});
