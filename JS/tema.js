(function () {

    // ========================================================
    // CONFIGURAÇÃO
    // ========================================================

    const THEME_KEY = 'pettok-theme';

    const SUPABASE_URL =
        'https://blpueqrzgqypkabjnvlu.supabase.co';

    const SUPABASE_ANON_KEY =
        'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';


    let supabaseTema = null;
    let usuarioTemaId = null;


    // ========================================================
    // APLICAR TEMA
    // ========================================================

    function aplicarTema(theme) {

        theme = theme === 'dark'
            ? 'dark'
            : 'light';

        document.documentElement.setAttribute(
            'data-theme',
            theme
        );

        localStorage.setItem(
            THEME_KEY,
            theme
        );


        // Esses elementos só existem na página
        // de configurações.
        const lightBtn =
            document.getElementById('lightBtn');

        const darkBtn =
            document.getElementById('darkBtn');

        const themeText =
            document.getElementById('themeText');


        if (lightBtn) {
            lightBtn.classList.toggle(
                'active',
                theme === 'light'
            );
        }


        if (darkBtn) {
            darkBtn.classList.toggle(
                'active',
                theme === 'dark'
            );
        }


        if (themeText) {
            themeText.textContent =
                theme === 'dark'
                    ? 'Tema escuro ativado'
                    : 'Tema claro ativado';
        }
    }


    // ========================================================
    // TEMA LOCAL
    // ========================================================

    function pegarTemaLocal() {

        return localStorage.getItem(THEME_KEY) === 'dark'
            ? 'dark'
            : 'light';
    }


    // ========================================================
    // CARREGAR TEMA DO SUPABASE
    // ========================================================

    async function carregarTemaDoSupabase() {

        try {

            // Verifica se o Supabase foi carregado
            if (!window.supabase) {

                console.warn(
                    'Supabase não foi carregado.'
                );

                return;
            }


            // Cria um cliente exclusivo do tema.
            // As variáveis ficam dentro desta função
            // e não entram em conflito com home.js,
            // perfil.js etc.
            supabaseTema =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_ANON_KEY
                );


            const {
                data,
                error
            } =
                await supabaseTema.auth.getSession();


            if (error) {

                console.error(
                    'Erro ao verificar sessão:',
                    error.message
                );

                return;
            }


            // Se não estiver logado, não faz nada.
            // A página continua funcionando normalmente.
            if (!data.session) {
                return;
            }


            usuarioTemaId =
                data.session.user.id;


            // Busca somente o mode
            const {
                data: perfil,
                error: erroPerfil
            } =
                await supabaseTema
                    .from('profiles')
                    .select('mode')
                    .eq('id', usuarioTemaId)
                    .single();


            if (erroPerfil) {

                console.error(
                    'Erro ao buscar mode:',
                    erroPerfil.message
                );

                return;
            }


            // mode 1 = escuro
            // mode 0 = claro
            const tema =
                Number(perfil.mode) === 1
                    ? 'dark'
                    : 'light';


            aplicarTema(tema);


        } catch (erro) {

            console.error(
                'Erro no tema global:',
                erro
            );
        }
    }


    // ========================================================
    // ALTERAR TEMA
    // ========================================================

    async function mudarTema(theme) {

        theme = theme === 'dark'
            ? 'dark'
            : 'light';


        const mode =
            theme === 'dark'
                ? 1
                : 0;


        // Primeiro muda a tela imediatamente
        aplicarTema(theme);


        // Se o cliente ainda não existe,
        // tenta criar novamente.
        if (!supabaseTema) {

            try {

                if (!window.supabase) {
                    return;
                }

                supabaseTema =
                    window.supabase.createClient(
                        SUPABASE_URL,
                        SUPABASE_ANON_KEY
                    );

            } catch (erro) {

                console.error(
                    'Erro ao criar cliente Supabase:',
                    erro
                );

                return;
            }
        }


        // Pega a sessão
        const {
            data,
            error
        } =
            await supabaseTema.auth.getSession();


        if (error || !data.session) {
            return;
        }


        usuarioTemaId =
            data.session.user.id;


        // Salva no Supabase
        const {
            error: erroUpdate
        } =
            await supabaseTema
                .from('profiles')
                .update({
                    mode: mode
                })
                .eq('id', usuarioTemaId);


        if (erroUpdate) {

            console.error(
                'Erro ao salvar tema:',
                erroUpdate.message
            );

            return;
        }


        // Se existir a função toast da página
        // de configurações, mostra a mensagem.
        if (typeof window.toast === 'function') {

            window.toast(
                theme === 'dark'
                    ? 'Tema escuro salvo 🌙'
                    : 'Tema claro salvo ☀️'
            );
        }
    }


    // ========================================================
    // DISPONIBILIZA A FUNÇÃO PARA O HTML
    // ========================================================

    window.setTheme = mudarTema;


    // ========================================================
    // APLICA TEMA LOCAL IMEDIATAMENTE
    // ========================================================

    aplicarTema(
        pegarTemaLocal()
    );


    // ========================================================
    // DEPOIS BUSCA O TEMA REAL DO BANCO
    // ========================================================

    carregarTemaDoSupabase();


})();
