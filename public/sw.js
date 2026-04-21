// Service worker for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'שיבוץ תורנות', body: event.data.text() };
  }

  const options = {
    body: data.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag ?? 'duty-notification',
    requireInteraction: false,
    dir: 'rtl',
    lang: 'he',
    data: data.url ? { url: data.url } : {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'מערכת שיבוצים', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/duty';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
