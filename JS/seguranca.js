const SITE = 'https://gabrielbasilioo.github.io/tcc-Telas/';
const quando = iso => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

(async () => {
    const me = await usuario();
    if (!me) return;
    $('email').value = me.email || '';
    $('ultimo').textContent = quando(me.last_sign_in_at);
    $('criada').textContent = quando(me.created_at);

    // ---- redefinir senha por e-mail (mesmo fluxo do "esqueci minha senha") ----
    $('enviarLink').onclick = async () => {
        const btn = $('enviarLink');
        btn.disabled = true;
        const { error } = await sbc.auth.resetPasswordForEmail(me.email, { redirectTo: SITE + 'nova-senha.html' });
        if (error) { btn.disabled = false; return toast(error.message); }
        toast('Link enviado! Confira seu e-mail (e o spam).');
        let s = 60;
        const t = setInterval(() => {
            btn.textContent = `Reenviar em ${s}s`;
            if (--s < 0) { clearInterval(t); btn.disabled = false; btn.textContent = 'Enviar link de redefinição'; }
        }, 1000);
    };

    // ---- trocar e-mail (com confirmação) ----
    $('trocarEmail').onclick = async () => {
        const novo = $('novoEmail').value.trim();
        if (!/^\S+@\S+\.\S+$/.test(novo)) return toast('Informe um e-mail válido.');
        if (novo.toLowerCase() === (me.email || '').toLowerCase()) return toast('Esse já é o seu e-mail.');
        const { error } = await sbc.auth.updateUser({ email: novo }, { emailRedirectTo: SITE + 'configuracoes.html' });
        if (error) return toast(error.message);
        $('novoEmail').value = '';
        toast('Enviamos um link de confirmação. Confira sua caixa de entrada.');
    };

    // ---- sessões ----
    $('outros').onclick = async () => {
        const { error } = await sbc.auth.signOut({ scope: 'others' });
        toast(error ? 'Não foi possível encerrar as outras sessões.' : 'Outras sessões encerradas.');
    };

    $('todos').onclick = async () => {
        if (!confirm('Sair de todos os dispositivos, inclusive este?')) return;
        const { error } = await sbc.auth.signOut({ scope: 'global' });
        if (error) return toast('Não foi possível sair de todos os dispositivos.');
        localStorage.removeItem('pettok-prefs');
        localStorage.removeItem('pettok-local');
        location.href = 'index.html';
    };

    // ---- excluir conta ----
    const modalEx = $('modalExcluir');
    window.fecharExcluir = () => {
        modalEx.classList.remove('open');
        $('exSenha').value = $('exTexto').value = '';
    };
    $('abrirExcluir').onclick = () => modalEx.classList.add('open');

    $('confirmarExcluir').onclick = async () => {
        const btn = $('confirmarExcluir');
        const senha = $('exSenha').value;
        if (!senha) return toast('Digite sua senha.');
        if ($('exTexto').value.trim().toUpperCase() !== 'EXCLUIR') return toast('Digite EXCLUIR para confirmar.');

        const volta = () => { btn.disabled = false; btn.textContent = 'Excluir definitivamente'; };
        btn.disabled = true;
        btn.textContent = 'Excluindo...';

        const { error: eSenha } = await sbc.auth.signInWithPassword({ email: me.email, password: senha });
        if (eSenha) { volta(); return toast('Senha incorreta.'); }

        const { error } = await sbc.functions.invoke('excluir-conta');
        if (error) { volta(); console.error('Erro ao excluir conta:', error); return toast('Não foi possível excluir a conta. Tente de novo.'); }

        try { await sbc.auth.signOut(); } catch {}
        Object.keys(localStorage).filter(k => k.startsWith('pettok')).forEach(k => localStorage.removeItem(k));
        alert('Sua conta foi excluída.');
        location.href = 'index.html';
    };
})();