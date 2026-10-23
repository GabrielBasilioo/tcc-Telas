// ======================================================
// PetTok - Notificações em TODAS as telas (menos o login)
// Incluir em: home, feed, cadastroPet, conversas, chat,
// perfil, configuracoes, notificacoes, ajuda-suporte.
// ======================================================
(() => {
    'use strict';

    // Nunca roda na tela de login
    if (document.getElementById('authForm')) return;
    if (!window.supabase) { console.warn('push.js: Supabase não carregado.'); return; }

    const SB_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
    const SB_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

    // 👉 COLE AQUI a chave PÚBLICA gerada com: npx web-push generate-vapid-keys
    const VAPID_PUBLIC_KEY = 'COLE_AQUI_SUA_CHAVE_PUBLICA_VAPID';

    const sb = window.supabase.createClient(SB_URL, SB_KEY);
    const pagina = location.pathname.split('/').pop() || 'index.html';

    const suportaPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    let me = null;
    let reg = null;
    const meusPets = new Set();
    const perfis = {};

    // ---------------- util ----------------
    function chaveParaBytes(b64) {
        const pad = '='.repeat((4 - b64.length % 4) % 4);
        const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    }

    async function perfilDe(id) {
        if (perfis[id]) return perfis[id];
        const { data } = await sb.from('profiles')
            .select('id, username, avatar_url, imagem_url').eq('id', id).maybeSingle();
        return (perfis[id] = data || {});
    }

    // ---------------- Service Worker + inscrição push ----------------
    async function registrarSW() {
        if (!('serviceWorker' in navigator)) return null;
        try {
            await navigator.serviceWorker.register('sw.js');
            reg = await navigator.serviceWorker.ready;
            return reg;
        } catch (e) { console.warn('SW:', e); return null; }
    }

    async function inscrever() {
        if (!suportaPush || !me || Notification.permission !== 'granted') return false;
        if (VAPID_PUBLIC_KEY.startsWith('COLE_AQUI')) {
            console.warn('push.js: configure a VAPID_PUBLIC_KEY.');
            return false;
        }
        try {
            reg = reg || await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: chaveParaBytes(VAPID_PUBLIC_KEY)
                });
            }
            const j = sub.toJSON();
            const { error } = await sb.rpc('save_push_subscription', {
                p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth
            });
            if (error) { console.error('Erro ao salvar inscrição:', error.message); return false; }
            return true;
        } catch (e) { console.error('Erro ao inscrever no push:', e); return false; }
    }

    async function ativar() {
        if (!suportaPush) return 'unsupported';
        if (ehIOS && !instalado) return 'ios-install';
        const r = Notification.permission === 'granted'
            ? 'granted' : await Notification.requestPermission();
        if (r === 'granted') await inscrever();
        return r;
    }

    async function desativar() {          // chamar no logout
        try {
            reg = reg || await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await sb.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
                await sub.unsubscribe();
            }
        } catch (e) { console.warn(e); }
    }

    window.PetTokPush = { ativar, desativar };

    // ---------------- Notificação feita pela própria página (reserva) ----------------
    // Usa a MESMA tag do servidor, então nunca aparece duplicada.
    async function mostrar({ tag, title, body, icon, url, de, tipo }) {
        if (!suportaPush || Notification.permission !== 'granted') return;
        const visivel = document.visibilityState === 'visible';
        if (visivel && pagina === 'notificacoes.html') return;
        if (visivel && tipo === 'message' && pagina === 'chat.html' &&
            new URLSearchParams(location.search).get('usuario') === de) return;
        try {
            reg = reg || await navigator.serviceWorker.ready;
            reg.showNotification(title, {
                body, icon: icon || 'IMG/logo.png', badge: 'IMG/logo.png',
                tag, vibrate: [120, 60, 120], data: { url }
            });
        } catch (e) { console.warn(e); }
    }

    function iniciarRealtime() {
        sb.channel('push-global-' + me.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, async p => {
                const l = p.new;
                if (!meusPets.has(l.pet_id) || l.user_id === me.id) return;
                const u = await perfilDe(l.user_id);
                mostrar({
                    tag: 'l' + (l.id ?? `${l.user_id}-${l.pet_id}`), tipo: 'like', de: l.user_id,
                    title: 'Nova curtida 🐾', body: `${u.username || 'Alguém'} curtiu seu pet`,
                    icon: u.imagem_url || u.avatar_url, url: `feed.html?pet=${l.pet_id}`
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${me.id}` }, async p => {
                const m = p.new;
                const u = await perfilDe(m.sender_id);
                mostrar({
                    tag: 'm' + m.id, tipo: 'message', de: m.sender_id,
                    title: u.username || 'Nova mensagem', body: m.content,
                    icon: u.imagem_url || u.avatar_url, url: `chat.html?usuario=${m.sender_id}`
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followers', filter: `following_id=eq.${me.id}` }, async p => {
                const f = p.new;
                const u = await perfilDe(f.follower_id);
                mostrar({
                    tag: 'f' + (f.id ?? f.follower_id), tipo: 'follow', de: f.follower_id,
                    title: 'Novo seguidor 🐾', body: `${u.username || 'Alguém'} começou a seguir você`,
                    icon: u.imagem_url || u.avatar_url, url: `perfil.html?id=${f.follower_id}`
                });
            })
            .subscribe();
    }

    // ---------------- Banner pedindo permissão ----------------
    function banner(texto, botao, aoClicar) {
        if (document.getElementById('pettokPushBanner')) return;
        const css = document.createElement('style');
        css.textContent = `
        #pettokPushBanner{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;
          width:calc(100% - 28px);max-width:430px;background:#fff;color:#333;border-radius:18px;
          padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.25);border-left:4px solid #FF7A29;
          font:700 12.5px/1.35 'Nunito',sans-serif;display:flex;align-items:center;gap:10px}
        #pettokPushBanner span{flex:1}
        #pettokPushBanner button{border:0;border-radius:20px;padding:8px 14px;cursor:pointer;
          font:700 13px 'Baloo 2',sans-serif}
        #pettokPushBanner .ok{background:linear-gradient(135deg,#FFA35C,#F26A15);color:#fff}
        #pettokPushBanner .no{background:transparent;color:#8A8A8F}
        html[data-theme="dark"] #pettokPushBanner{background:#292929;color:#eee}`;
        document.head.appendChild(css);

        const el = document.createElement('div');
        el.id = 'pettokPushBanner';
        el.innerHTML = `<span>${texto}</span>${botao ? '<button class="ok">' + botao + '</button>' : ''}<button class="no">Agora não</button>`;
        document.body.appendChild(el);

        const fechar = (dias) => {
            localStorage.setItem('pettok_push_dispensado', String(Date.now() + dias * 864e5));
            el.remove();
        };
        el.querySelector('.no').onclick = () => fechar(7);
        const ok = el.querySelector('.ok');
        if (ok) ok.onclick = async () => { await aoClicar(); el.remove(); };
    }

    function oferecerPermissao() {
        if (Number(localStorage.getItem('pettok_push_dispensado') || 0) > Date.now()) return;
        if (ehIOS && !instalado) {
            banner('Para receber avisos no iPhone: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b> e abra o PetTok por lá.', null);
            return;
        }
        banner('🔔 Quer receber avisos de curtidas, mensagens e seguidores, mesmo com o app fechado?', 'Ativar', async () => {
            const r = await ativar();
            if (r === 'denied') alert('Notificações bloqueadas. Libere nas configurações do navegador (ícone de cadeado).');
        });
    }

    // ---------------- Início ----------------
    document.addEventListener('DOMContentLoaded', async () => {
        const { data } = await sb.auth.getUser();
        if (!data || !data.user) return;          // não logado: não faz nada
        me = data.user;

        await registrarSW();

        const { data: pets } = await sb.from('pets').select('id').eq('user_id', me.id);
        (pets || []).forEach(p => meusPets.add(p.id));

        iniciarRealtime();

        if (!suportaPush) return;
        if (Notification.permission === 'granted') await inscrever();
        else if (Notification.permission === 'default') setTimeout(oferecerPermissao, 1500);

        // Se a permissão for concedida por outro botão (ex.: tela de notificações)
        try {
            const st = await navigator.permissions.query({ name: 'notifications' });
            st.onchange = () => { if (Notification.permission === 'granted') inscrever(); };
        } catch {}

        navigator.serviceWorker.addEventListener('message', ev => {
            if (ev.data && ev.data.type === 'resubscribe') inscrever();
        });
    });
})();