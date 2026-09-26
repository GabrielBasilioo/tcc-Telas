const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

const THEME_KEY = 'pettok-theme';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

function go(page) {
    location.href = page;
}

function toast(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');

    clearTimeout(window._toast);

    window._toast = setTimeout(() => {
        el.classList.remove('show');
    }, 2200);
}

function modal(title, text, extra = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = text;
    document.getElementById('modalExtra').textContent = extra;
    document.getElementById('modal').classList.add('open');
}

function closeModal() {
    document.getElementById('modal').classList.remove('open');
}

async function notifications() {
    if (!('Notification' in window)) {
        toast('Seu navegador não suporta notificações.');
        return;
    }

    if (Notification.permission === 'granted') {
        toast('Notificações já estão ativadas.');
        return;
    }

    const p = await Notification.requestPermission();

    toast(
        p === 'granted'
            ? 'Notificações ativadas.'
            : 'Permissão não concedida.'
    );
}

function locationAccess() {
    if (!navigator.geolocation) {
        toast('Localização não disponível.');
        return;
    }

    document.getElementById('locationText').textContent =
        'Solicitando localização...';

    navigator.geolocation.getCurrentPosition(
        () => {
            document.getElementById('locationText').textContent =
                'Localização permitida';

            toast('Localização atualizada.');
        },
        () => {
            document.getElementById('locationText').textContent =
                'Permissão não concedida';

            toast('Não foi possível acessar sua localização.');
        }
    );
}

async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error('Erro ao fazer logout:', error);
            toast('Não foi possível sair da conta.');
            return;
        }

        localStorage.removeItem(THEME_KEY);

        window.location.href = 'index.html';

    } catch (error) {
        console.error('Erro no logout:', error);
        toast('Erro ao sair da conta.');
    }
}