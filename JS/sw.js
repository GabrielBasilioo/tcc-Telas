// ======================================================
// PetTok - Service Worker (Web Push)
// Fica na RAIZ do site, junto com os .html
// ======================================================
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Chegou um push do servidor (funciona com o site FECHADO)
self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; }
    catch { d = { body: e.data && e.data.text() }; }

    e.waitUntil((async () => {
        // Não incomoda se o usuário já está olhando exatamente essa tela
        const abertas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const jaVendo = abertas.some(c =>
            c.visibilityState === 'visible' && c.focused && (
                c.url.includes('notificacoes.html') ||
                (d.tipo === 'message' && d.de &&
                 c.url.includes('chat.html') && c.url.includes('usuario=' + d.de))
            )
        );
        if (jaVendo) return;

        await self.registration.showNotification(d.title || 'PetTok 🐾', {
            body: d.body || '',
            icon: d.icon || 'IMG/logo.png',
            badge: 'IMG/logo.png',
            tag: d.tag || undefined,          // mesma tag = substitui, nunca duplica
            vibrate: [120, 60, 120],
            data: { url: d.url || 'notificacoes.html' }
        });
    })());
});

// Ao tocar na notificação, abre/foca o app na tela certa
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = new URL(
        (e.notification.data && e.notification.data.url) || 'notificacoes.html',
        self.registration.scope
    ).href;

    e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
        for (const c of list) {
            if ('focus' in c) {
                try { await c.navigate(url); } catch {}
                return c.focus();
            }
        }
        return clients.openWindow(url);
    }));
});

// Se o navegador renovar a inscrição, avisa as páginas abertas para salvar de novo
self.addEventListener('pushsubscriptionchange', e => {
    e.waitUntil(clients.matchAll({ includeUncontrolled: true }).then(list =>
        list.forEach(c => c.postMessage({ type: 'resubscribe' }))
    ));
});