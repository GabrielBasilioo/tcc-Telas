// ============================================================
// FEED DE PETS - PetTok
// ============================================================
// Feed estilo TikTok/Reels
// Pode exibir IMAGEM ou VÍDEO
// Cada publicação representa um pet para adoção
//
// IMPORTANTE:
// Este arquivo foi pensado para trabalhar com Supabase.
// A tabela "pets" deverá conter futuramente os dados dos pets.
//
// Campos esperados:
// id
// user_id
// nome
// especie
// raca
// idade
// descricao
// microchipado
// castrado
// media_url
// media_type
// cidade
// estado
// ============================================================


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
    'https://blpueqrzgqypkabjnvlu.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

let supabaseClient = null;

try {

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

} catch (error) {

    console.error(
        'Não foi possível conectar ao Supabase:',
        error
    );

}


// ============================================================
// USUÁRIO ATUAL
// ============================================================

let currentUser = null;
let currentProfile = null;

let podePublicar = false;


// ============================================================
// ELEMENTOS DO FEED
// ============================================================

const feed = document.getElementById('feed');

const feedLoading =
    document.getElementById('feedLoading');

const feedEmpty =
    document.getElementById('feedEmpty');


// ============================================================
// VERIFICAR LOGIN
// ============================================================

async function verificarUsuario() {

    if (!supabaseClient) {
        return false;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {

        console.error(
            'Erro ao verificar sessão:',
            error.message
        );

        return false;
    }

    if (!data.session) {

        window.location.href = 'login.html';

        return false;
    }

    currentUser = data.session.user;

    return true;
}


// ============================================================
// VERIFICAR IDADE
// ============================================================

function tem18AnosOuMais(dataNascimento) {

    if (!dataNascimento) {
        return false;
    }

    const nascimento =
        new Date(dataNascimento + 'T00:00:00');

    const hoje = new Date();

    let idade =
        hoje.getFullYear() -
        nascimento.getFullYear();

    const diferencaMes =
        hoje.getMonth() -
        nascimento.getMonth();

    if (
        diferencaMes < 0 ||
        (
            diferencaMes === 0 &&
            hoje.getDate() < nascimento.getDate()
        )
    ) {

        idade--;
    }

    return idade >= 18;
}


// ============================================================
// CARREGAR PERFIL DO USUÁRIO
// ============================================================

async function carregarPerfilUsuario() {

    if (!currentUser) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from('profiles')
        .select(`
            username,
            avatar_url,
            birth_date
        `)
        .eq('id', currentUser.id)
        .single();

    if (error) {

        console.error(
            'Erro ao carregar perfil:',
            error.message
        );

        return;
    }

    currentProfile = data;

    // Verifica se possui 18 anos ou mais
    podePublicar =
        tem18AnosOuMais(data.birth_date);

    console.log(
        'Usuário pode publicar:',
        podePublicar
    );
}


// ============================================================
// CARREGAR PETS DO FEED
// ============================================================

async function carregarFeed() {

    if (!supabaseClient) {
        return;
    }

    if (feedLoading) {
        feedLoading.style.display = 'flex';
    }

    if (feedEmpty) {
        feedEmpty.style.display = 'none';
    }


    // Limpa publicações antigas
    if (feed) {
        feed.innerHTML = '';
    }


    const {
        data: pets,
        error
    } = await supabaseClient
        .from('pets')
        .select(`
            id,
            user_id,
            nome,
            especie,
            raca,
            idade,
            descricao,
            microchipado,
            castrado,
            media_url,
            media_type,
            cidade,
            estado
        `)
        .order(
            'created_at',
            {
                ascending: false
            }
        );


    if (feedLoading) {
        feedLoading.style.display = 'none';
    }


    if (error) {

        console.error(
            'Erro ao carregar feed:',
            error.message
        );

        if (feedEmpty) {
            feedEmpty.style.display = 'flex';
            feedEmpty.textContent =
                'Não foi possível carregar os pets.';
        }

        return;
    }


    if (!pets || pets.length === 0) {

        if (feedEmpty) {
            feedEmpty.style.display = 'flex';
        }

        return;
    }


    // Cria cada publicação
    pets.forEach(pet => {

        criarPublicacao(pet);

    });

}


// ============================================================
// CRIAR PUBLICAÇÃO
// ============================================================

function criarPublicacao(pet) {

    if (!feed) {
        return;
    }


    // --------------------------------------------------------
    // CONTAINER
    // --------------------------------------------------------

    const post = document.createElement('article');

    post.className = 'feed-post';

    post.dataset.petId = pet.id;


    // --------------------------------------------------------
    // MÍDIA
    // --------------------------------------------------------

    const mediaContainer =
        document.createElement('div');

    mediaContainer.className =
        'feed-media';


    if (
        pet.media_type === 'video' ||
        (
            pet.media_url &&
            (
                pet.media_url.endsWith('.mp4') ||
                pet.media_url.endsWith('.webm') ||
                pet.media_url.endsWith('.mov')
            )
        )
    ) {

        const video =
            document.createElement('video');

        video.src = pet.media_url;

        video.className =
            'feed-media-content';

        video.loop = true;

        video.muted = true;

        video.playsInline = true;

        video.preload = 'metadata';


        // Tocar somente quando o usuário
        // estiver vendo o vídeo
        video.addEventListener(
            'click',
            () => {

                if (video.paused) {

                    video.play();

                } else {

                    video.pause();

                }

            }
        );


        mediaContainer.appendChild(video);

    } else {

        const imagem =
            document.createElement('img');

        imagem.src =
            pet.media_url || '';

        imagem.className =
            'feed-media-content';

        imagem.alt =
            pet.nome || 'Pet para adoção';


        mediaContainer.appendChild(imagem);
    }


    // --------------------------------------------------------
    // GRADIENTE
    // --------------------------------------------------------

    const gradient =
        document.createElement('div');

    gradient.className =
        'feed-gradient';

    mediaContainer.appendChild(gradient);


    // --------------------------------------------------------
    // INFORMAÇÕES DO PET
    // --------------------------------------------------------

    const info =
        document.createElement('div');

    info.className =
        'feed-info';


    const nome =
        document.createElement('h2');

    nome.textContent =
        pet.nome || 'Pet';


    const usuario =
        document.createElement('div');

    usuario.className =
        'feed-user';

    usuario.textContent =
        '@usuário';


    const detalhes =
        document.createElement('div');

    detalhes.className =
        'feed-details';


    let detalhesTexto = '';

    if (pet.idade !== null &&
        pet.idade !== undefined) {

        if (detalhesTexto) {
            detalhesTexto += '  •  ';
        }

        detalhesTexto +=
            pet.idade + ' ano(s)';
    }


    if (pet.especie) {

        if (detalhesTexto) {
            detalhesTexto += '  •  ';
        }

        detalhesTexto +=
            pet.especie;
    }


    detalhes.textContent =
        detalhesTexto;


    const descricao =
        document.createElement('p');

    descricao.className =
        'feed-description';

    descricao.textContent =
        pet.descricao || '';


    info.appendChild(nome);

    info.appendChild(usuario);

    info.appendChild(detalhes);

    info.appendChild(descricao);


    mediaContainer.appendChild(info);


    // --------------------------------------------------------
    // BOTÕES LATERAIS
    // --------------------------------------------------------

    const actions =
        document.createElement('div');

    actions.className =
        'feed-actions';


    // CURTIR
    const likeButton =
        criarBotaoAcao(
            '♡',
            'Curtir'
        );

    likeButton.addEventListener(
        'click',
        () => {

            likeButton.classList.toggle(
                'liked'
            );

            likeButton.querySelector(
                '.action-icon'
            ).textContent =
                likeButton.classList.contains(
                    'liked'
                )
                    ? '♥'
                    : '♡';

        }
    );


    // MENSAGEM
    const messageButton =
        criarBotaoAcao(
            '▤',
            'Mensagem'
        );

    messageButton.addEventListener(
        'click',
        () => {

            abrirChatComDono(
                pet.user_id
            );

        }
    );


    // COMPARTILHAR
    const shareButton =
        criarBotaoAcao(
            '↗',
            'Compartilhar'
        );

    shareButton.addEventListener(
        'click',
        () => {

            compartilharPet(pet);

        }
    );


    // SALVAR
    const saveButton =
        criarBotaoAcao(
            '🔖',
            'Salvar'
        );

    saveButton.addEventListener(
        'click',
        () => {

            saveButton.classList.toggle(
                'saved'
            );

        }
    );


    actions.appendChild(likeButton);

    actions.appendChild(messageButton);

    actions.appendChild(shareButton);

    actions.appendChild(saveButton);


    mediaContainer.appendChild(actions);


    // --------------------------------------------------------
    // ADICIONA AO FEED
    // --------------------------------------------------------

    post.appendChild(mediaContainer);

    feed.appendChild(post);
}


// ============================================================
// CRIAR BOTÃO LATERAL
// ============================================================

function criarBotaoAcao(
    icone,
    texto
) {

    const button =
        document.createElement('button');

    button.className =
        'feed-action';

    button.type =
        'button';


    const icon =
        document.createElement('span');

    icon.className =
        'action-icon';

    icon.textContent =
        icone;


    const label =
        document.createElement('span');

    label.className =
        'action-label';

    label.textContent =
        texto;


    button.appendChild(icon);

    button.appendChild(label);


    return button;
}


// ============================================================
// COMPARTILHAR PET
// ============================================================

async function compartilharPet(pet) {

    const texto =
        `Conheça ${pet.nome || 'este pet'} para adoção!`;

    const url =
        window.location.href +
        '?pet=' +
        pet.id;


    if (
        navigator.share
    ) {

        try {

            await navigator.share({

                title:
                    pet.nome || 'Pet para adoção',

                text:
                    texto,

                url:
                    url

            });

        } catch (error) {

            // Usuário cancelou o compartilhamento
        }

    } else {

        try {

            await navigator.clipboard.writeText(
                url
            );

            alert(
                'Link copiado!'
            );

        } catch (error) {

            alert(
                'Não foi possível compartilhar.'
            );

        }
    }
}


// ============================================================
// CHAT
// ============================================================

function abrirChatComDono(
    donoId
) {

    if (!donoId) {

        alert(
            'Não foi possível identificar o dono deste pet.'
        );

        return;
    }


    // Futuramente:
    // Podemos passar o ID do dono para
    // mensagens.html

    window.location.href =
        'mensagens.html?usuario=' +
        encodeURIComponent(donoId);
}


// ============================================================
// NAVEGAÇÃO INFERIOR
// ============================================================

function configurarNavegacao() {

    const navItems =
        document.querySelectorAll(
            '.bottom-nav .nav-item'
        );


    navItems.forEach(
        item => {

            item.addEventListener(
                'click',
                () => {

                    const pagina =
                        item.dataset.page;


                    if (
                        pagina === 'home'
                    ) {

                        window.location.href =
                            'home.html';

                    }


                    if (
                        pagina === 'pets'
                    ) {

                        window.location.href =
                            'cadastroPet.html';

                    }


                    if (
                        pagina === 'messages'
                    ) {

                        window.location.href =
                            'mensagens.html';

                    }


                    if (
                        pagina === 'profile'
                    ) {

                        window.location.href =
                            'perfil.html';

                    }

                }
            );

        }
    );
}


// ============================================================
// BOLINHA CENTRAL → FEED
// ============================================================

function configurarBotaoCentral() {

    const central =
        document.querySelector(
            '.nav-center'
        );


    if (!central) {
        return;
    }


    central.addEventListener(
        'click',
        () => {

            window.location.href =
                'feed.html';

        }
    );
}


// ============================================================
// BLOQUEIO DE PUBLICAÇÃO PARA MENORES
// ============================================================

function configurarBotaoPublicar() {

    const botaoPublicar =
        document.getElementById(
            'publishButton'
        );


    if (!botaoPublicar) {
        return;
    }


    // Menor de 18 não publica
    if (!podePublicar) {

        botaoPublicar.disabled =
            true;

        botaoPublicar.classList.add(
            'disabled'
        );

        botaoPublicar.title =
            'Você precisa ter 18 anos ou mais para publicar.';

    }


    botaoPublicar.addEventListener(
        'click',
        () => {

            if (!podePublicar) {

                alert(
                    'Você precisa ter 18 anos ou mais para publicar no feed.'
                );

                return;
            }


            window.location.href =
                'cadastroPet.html';

        }
    );
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function iniciarFeed() {

    const logado =
        await verificarUsuario();


    if (!logado) {
        return;
    }


    await carregarPerfilUsuario();


    configurarNavegacao();

    configurarBotaoCentral();

    configurarBotaoPublicar();


    await carregarFeed();

}


// ============================================================
// INICIAR
// ============================================================

iniciarFeed();
