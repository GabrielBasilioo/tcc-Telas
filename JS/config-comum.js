const sbc = window.supabase.createClient(
    'https://blpueqrzgqypkabjnvlu.supabase.co',
    'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg'
);
const $ = id => document.getElementById(id);

function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(window._toast);
    window._toast = setTimeout(() => el.classList.remove('show'), 2400);
}

async function usuario() {
    const { data } = await sbc.auth.getUser();
    if (!data || !data.user) { location.href = 'index.html'; return null; }
    return data.user;
}

async function lerPerfil(id, cols) {
    const { data } = await sbc.from('profiles').select(cols).eq('id', id).maybeSingle();
    return data || {};
}

async function salvarPerfil(id, obj) {
    const { data, error } = await sbc.from('profiles').update(obj).eq('id', id).select('id');
    if (error) return error;
    if (!data || !data.length) return { message: 'perfil não encontrado ou sem permissão para salvar.' };
    return null;
}

function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}