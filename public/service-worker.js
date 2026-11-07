self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.ico',
        data: { url: data.url },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const destination = new URL(event.notification.data?.url || '/calendar', self.location.origin).href;
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const existing = clients.find((client) => client.url === destination);
        if (existing) return existing.focus();
        return self.clients.openWindow(destination);
    }));
});
