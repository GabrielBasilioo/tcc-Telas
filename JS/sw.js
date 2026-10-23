self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Push vindo de um servidor (Web Push)
self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
    e.waitUntil(self.registration.showNotification(d.title || 'PetTok 🐾', {
        body: d.body || '',
        icon: d.icon || 'IMG/logo.png',
        badge: 'IMG/logo.png',
        data: { url: d.url || 'notificacoes.html' }
    }));
});

// Ao tocar na notificação, abre/foca o app na tela certa
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || 'notificacoes.html';
    e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus(); }
        return clients.openWindow(url);
    }));
});