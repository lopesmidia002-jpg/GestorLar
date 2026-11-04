/* eslint-disable no-undef */
// Service Worker para Firebase Cloud Messaging (Web Push) - GestorLar

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Recebe mensagens em segundo plano quando a aba/app estiver fechada
self.addEventListener('push', function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { notification: { body: event.data.text() } };
    }
  }

  const notificationTitle =
    (data.notification && data.notification.title) ||
    (data.data && data.data.title) ||
    'GestorLar • Notificação Financeira';

  const notificationOptions = {
    body:
      (data.notification && data.notification.body) ||
      (data.data && data.data.body) ||
      'Você tem novidades e lembretes no seu orçamento familiar!',
    icon: '/notification-logo.png',
    badge: '/push-badge.png',
    vibrate: [200, 100, 200],
    tag: 'gestorlar-notification',
    renotify: true,
    data: {
      url: (data.data && data.data.url) || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Abrir GestorLar' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Ação ao clicar na notificação push
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // Se a janela já estiver aberta, dá foco nela
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Caso contrário, abre uma nova janela
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
