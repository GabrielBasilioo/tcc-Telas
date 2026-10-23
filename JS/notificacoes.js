(() => {
    const SB_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
    const SB_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';
    const sb = window.supabase.createClient(SB_URL, SB_KEY);

    const listEl = document.getElementById('notifList');   // só existe em notificacoes.html
    const isPage = !!listEl;

    let me = null;
    let myPetIds = new Set();
    let myPets = {};
    let items = [];
    let filtro = 'todas';
    let perfis = {};

    const NOIMG = 'https://placehold.co/100x100?text=Pet';
    const lastSeenKey = () => `pettok_notif_visto_${me.id}`;
    const lastSeen = () => Number(localStorage.getItem(lastSeenKey()) || 0);

    const ICONS = {
        like: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 5 6.1 5c2 0 3.3 1 3.9 2.2h4C14.6 6 15.9 5 17.9 5c3.3 0 5.2 3.4 3.7 6.8C19.5 16.4 12 21 12 21Z"/></svg>',
        message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4A7.5 7.5 0 1 1 20 11.5Z"/></svg>',
        follow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg>'
    };

    // ================= INICIAR =================
    document.addEventListener('DOMContentLoaded', async () => {
        const { data } = await sb.auth.getUser();
        if (!data || !data.user) { if (isPage) location.href = 'index.html'; return; }
        me = data.user;

        await carregarMeusPets();
        await registrarSW();
        iniciarRealtime();

        if (isPage) {
            iniciarPermissao();
            iniciarFiltros();
            document.getElementById('markAllRead').addEventListener('click', marcarTudoLido);
            await carregar();
        } else {
            await atualizarBadge();
        }
    });

    async function carregarMeusPets() {
        const { data } = await sb.from('pets')
            .select('id, nome, media_url, media_type').eq('user_id', me.id);
        (data || []).forEach(p => { myPets[p.id] = p; myPetIds.add(p.id); });
    }

    async function buscarPerfis(ids) {
        const novos = [...new Set(ids)].filter(id => id && !perfis[id]);
        if (!novos.length) return;
        const { data } = await sb.from('profiles')
            .select('id, username, avatar_url, imagem_url').in('id', novos);
        (data || []).forEach(p => perfis[p.id] = p);
    }

    // ================= CARREGAR =================
    async function carregarBruto() {
        const lista = [];

        if (myPetIds.size) {
            const { data } = await sb.from('likes').select('*')
                .in('pet_id', [...myPetIds]).neq('user_id', me.id);
            (data || []).forEach(l => lista.push({
                id: 'l' + (l.id ?? `${l.user_id}-${l.pet_id}`),
                tipo: 'like', de: l.user_id, pet_id: l.pet_id,
                data: l.created_at || new Date(0).toISOString()
            }));
        }

        const { data: msgs } = await sb.from('messages')
            .select('id, sender_id, content, created_at')
            .eq('receiver_id', me.id).order('created_at', { ascending: false }).limit(60);
        (msgs || []).forEach(m => lista.push({
            id: 'm' + m.id, tipo: 'message', de: m.sender_id,
            texto: m.content, data: m.created_at
        }));

        const { data: segs } = await sb.from('followers').select('*').eq('following_id', me.id);
        (segs || []).forEach(f => lista.push({
            id: 'f' + (f.id ?? f.follower_id), tipo: 'follow', de: f.follower_id,
            data: f.created_at || new Date(0).toISOString()
        }));

        lista.sort((a, b) => new Date(b.data) - new Date(a.data));
        await buscarPerfis(lista.map(n => n.de));
        return lista;
    }

    async function carregar() {
        try {
            items = await carregarBruto();
            renderizar();
        } catch (e) {
            console.error(e);
            listEl.innerHTML = '<div class="error-message">Não foi possível carregar suas notificações.</div>';
        }
    }

    // ================= RENDER =================
    function renderizar() {
        const visto = lastSeen();
        const lista = items.filter(n => filtro === 'todas' || n.tipo === filtro);
        listEl.innerHTML = '';

        if (!lista.length) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div>
                <h2>Nada por aqui</h2><p>Quando alguém curtir seus pets, mandar mensagem ou seguir você, aparece aqui.</p></div>`;
            return;
        }

        const novas = lista.filter(n => new Date(n.data) > visto);
        const antigas = lista.filter(n => new Date(n.data) <= visto);

        if (novas.length) { addTitulo('Novas'); novas.forEach(n => listEl.appendChild(criarItem(n, true))); }
        if (antigas.length) { addTitulo(novas.length ? 'Anteriores' : 'Todas'); antigas.forEach(n => listEl.appendChild(criarItem(n, false))); }
    }

    function addTitulo(t) {
        const h = document.createElement('div');
        h.className = 'section-title';
        h.textContent = t;
        listEl.appendChild(h);
    }

    function textoDe(n) {
        const p = perfis[n.de] || {};
        const nome = esc(p.username || 'Alguém');
        if (n.tipo === 'like') {
            const pet = myPets[n.pet_id];
            return `<b>${nome}</b> curtiu ${pet ? 'o pet <b>' + esc(pet.nome) + '</b>' : 'seu pet'}`;
        }
        if (n.tipo === 'message') return `<b>${nome}</b> enviou uma mensagem`;
        return `<b>${nome}</b> começou a seguir você`;
    }

    function criarItem(n, naoLida) {
        const p = perfis[n.de] || {};
        const el = document.createElement('div');
        el.className = 'notif-item' + (naoLida ? ' unread' : '');

        let thumb = '';
        if (n.tipo === 'like' && myPets[n.pet_id] && myPets[n.pet_id].media_url) {
            const pet = myPets[n.pet_id];
            thumb = pet.media_type && pet.media_type.startsWith('video')
                ? `<video class="notif-thumb" src="${esc(pet.media_url)}#t=0.1" muted preload="metadata"></video>`
                : `<img class="notif-thumb" src="${esc(pet.media_url)}" alt="">`;
        }

        el.innerHTML = `
            <div class="notif-avatar">
                <img src="${esc(p.imagem_url || p.avatar_url || NOIMG)}" alt="" onerror="this.src='${NOIMG}'">
                <span class="notif-type ${n.tipo}">${ICONS[n.tipo]}</span>
            </div>
            <div class="notif-info">
                <div class="notif-text">${textoDe(n)}</div>
                ${n.texto ? `<div class="notif-preview">${esc(n.texto)}</div>` : ''}
                <div class="notif-time">${tempo(n.data)}</div>
            </div>
            ${thumb}
            ${naoLida ? '<span class="notif-dot"></span>' : ''}`;

        el.addEventListener('click', () => abrir(n));
        return el;
    }

    function abrir(n) {
        if (n.tipo === 'like') location.href = `feed.html?pet=${encodeURIComponent(n.pet_id)}`;
        else if (n.tipo === 'message') location.href = `chat.html?usuario=${encodeURIComponent(n.de)}`;
        else location.href = `perfil.html?id=${encodeURIComponent(n.de)}`;
    }

    // ================= FILTROS / LIDO =================
    function iniciarFiltros() {
        document.getElementById('filterTabs').addEventListener('click', e => {
            const btn = e.target.closest('.filter-tab');
            if (!btn) return;
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtro = btn.dataset.filter;
            renderizar();
        });
    }

    function marcarTudoLido() {
        localStorage.setItem(lastSeenKey(), String(Date.now()));
        renderizar();
    }

    async function atualizarBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        const lista = await carregarBruto();
        const n = lista.filter(i => new Date(i.data) > lastSeen()).length;
        badge.textContent = n > 99 ? '99+' : n;
        badge.style.display = n ? 'flex' : 'none';
    }

    // ================= REALTIME =================
    function iniciarRealtime() {
        sb.channel('notificacoes-' + me.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' },
                p => { if (myPetIds.has(p.new.pet_id) && p.new.user_id !== me.id) novo({ tipo: 'like', de: p.new.user_id, pet_id: p.new.pet_id, id: 'l' + (p.new.id ?? p.new.user_id + '-' + p.new.pet_id), data: p.new.created_at || new Date().toISOString() }); })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${me.id}` },
                p => novo({ tipo: 'message', de: p.new.sender_id, texto: p.new.content, id: 'm' + p.new.id, data: p.new.created_at }))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followers', filter: `following_id=eq.${me.id}` },
                p => novo({ tipo: 'follow', de: p.new.follower_id, id: 'f' + (p.new.id ?? p.new.follower_id), data: p.new.created_at || new Date().toISOString() }))
            .subscribe();
    }

    async function novo(n) {
        await buscarPerfis([n.de]);
        if (!items.some(i => i.id === n.id)) items.unshift(n);
        if (isPage) { renderizar(); toast(n); } else atualizarBadge();
        enviarNotificacaoSistema(n);
    }

    // ================= NOTIFICAÇÃO DO SISTEMA (PC / CELULAR) =================
    async function registrarSW() {
        if (!('serviceWorker' in navigator)) return;
        try { await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('SW:', e); }
    }

    async function enviarNotificacaoSistema(n) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        if (document.visibilityState === 'visible' && isPage) return; // já aparece na tela
        const p = perfis[n.de] || {};
        const titulo = n.tipo === 'message' ? (p.username || 'Nova mensagem')
                     : n.tipo === 'like' ? 'Nova curtida 🐾' : 'Novo seguidor 🐾';
        const corpo = n.tipo === 'message' ? n.texto
                    : n.tipo === 'like' ? `${p.username || 'Alguém'} curtiu seu pet`
                    : `${p.username || 'Alguém'} começou a seguir você`;
        const opts = {
            body: corpo, icon: p.imagem_url || p.avatar_url || 'IMG/logo.png',
            badge: 'IMG/logo.png', tag: n.id,
            data: { url: n.tipo === 'like' ? `feed.html?pet=${n.pet_id}` : n.tipo === 'message' ? `chat.html?usuario=${n.de}` : `perfil.html?id=${n.de}` }
        };
        try {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(titulo, opts);
        } catch { new Notification(titulo, opts); }
    }

    // ================= PERMISSÃO (estilo Google) =================
    function iniciarPermissao() {
        const card = document.getElementById('permissionCard');
        const msg = document.getElementById('permissionMsg');
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted' || localStorage.getItem('pettok_notif_aceito') === '1') {
            localStorage.setItem('pettok_notif_aceito', '1');
            card.hidden = true;
            return;
        }

        const dispensado = localStorage.getItem('pettok_notif_dispensado') === '1';
        if (Notification.permission === 'default' && !dispensado) card.hidden = false;
        if (Notification.permission === 'denied') {
            msg.textContent = 'As notificações estão bloqueadas. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço).';
            card.querySelector('#allowNotif').style.display = 'none';
            card.hidden = false;
        }

        document.getElementById('denyNotif').addEventListener('click', () => {
            localStorage.setItem('pettok_notif_dispensado', '1');
            card.hidden = true;
        });

        document.getElementById('allowNotif').addEventListener('click', async e => {
            e.target.disabled = true;
            const r = await Notification.requestPermission();
            if (r === 'granted') {
                localStorage.setItem('pettok_notif_aceito', '1');
                card.hidden = true;
                mostrarToast('Notificações ativadas! 🐾');
                enviarNotificacaoSistema({ tipo: 'follow', de: me.id, id: 'teste' + Date.now() });
            } else {
                e.target.disabled = false;
                if (r === 'denied') {
                    msg.textContent = 'As notificações estão bloqueadas. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço).';
                    e.target.style.display = 'none';
                }
            }
        });
    }

    // ================= UTIL =================
    let toastTimer;
    function toast(n) {
        const p = perfis[n.de] || {};
        const txt = n.tipo === 'message' ? `${p.username || 'Alguém'}: ${n.texto}` : textoDe(n).replace(/<[^>]+>/g, '');
        mostrarToast(txt, () => abrir(n));
    }
    function mostrarToast(txt, onClick) {
        const t = document.getElementById('toast');
        t.textContent = txt;
        t.onclick = onClick || null;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
    }

    function tempo(iso) {
        const s = Math.floor((Date.now() - new Date(iso)) / 1000);
        if (s < 60) return 'agora';
        if (s < 3600) return `${Math.floor(s / 60)} min`;
        if (s < 86400) return `${Math.floor(s / 3600)} h`;
        if (s < 604800) return `${Math.floor(s / 86400)} d`;
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function esc(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
})();