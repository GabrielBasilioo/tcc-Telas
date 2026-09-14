const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const feed = document.getElementById('feed');
const feedLoading = document.getElementById('feedLoading');

let currentUser = null;

async function verificarUsuario() {
    const { data, error } =
        await supabaseClient.auth.getSession();

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

async function carregarFeed() {
    if (!feed) {
        console.error('Elemento #feed não encontrado.');
        return;
    }

    if (feedLoading) {
        feedLoading.style.display = 'flex';
    }

    const { data: pets, error } =
        await supabaseClient
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
                created_at
            `)
            .order('created_at', {
                ascending: false
            });

    if (feedLoading) {
        feedLoading.style.display = 'none';
    }

    if (error) {
        console.error(
            'Erro ao carregar pets:',
            error
        );

        mostrarMensagem(
            'Erro ao carregar os pets.'
        );

        return;
    }

    if (!pets || pets.length === 0) {
        mostrarMensagem(
            'Nenhum pet cadastrado.'
        );

        return;
    }

    feed.innerHTML = '';

    pets.forEach((pet) => {
        criarPublicacao(pet);
    });
}

function criarPublicacao(pet) {
    const post =
        document.createElement('article');

    post.className = 'feed-post';

    post.dataset.petId = pet.id;

    const media =
        document.createElement('div');

    media.className = 'post-media';

    if (pet.media_url) {
        if (
            pet.media_type === 'video' ||
            pet.media_url.match(
                /\.(mp4|webm|mov)(\?.*)?$/i
            )
        ) {
            const video =
                document.createElement('video');

            video.src = pet.media_url;

            video.className =
                'post-media';

            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;

            video.addEventListener(
                'error',
                () => {
                    mostrarPlaceholder(
                        media,
                        pet
                    );
                }
            );

            media.appendChild(video);
        } else {
            const imagem =
                document.createElement('img');

            imagem.src = pet.media_url;

            imagem.className =
                'post-media';

            imagem.alt =
                pet.nome || 'Pet para adoção';

            imagem.addEventListener(
                'error',
                () => {
                    imagem.remove();

                    mostrarPlaceholder(
                        media,
                        pet
                    );
                }
            );

            media.appendChild(imagem);
        }
    } else {
        mostrarPlaceholder(
            media,
            pet
        );
    }

    const info =
        document.createElement('div');

    info.className = 'post-info';

    const nome =
        document.createElement('h2');

    nome.className = 'pet-name';

    nome.textContent =
        pet.nome || 'Pet';

    const owner =
        document.createElement('div');

    owner.className = 'pet-owner';

    owner.textContent =
        'Pet para adoção';

    const detalhes =
        document.createElement('div');

    detalhes.className =
        'pet-details';

    const dados = [];

    if (pet.especie) {
        dados.push(pet.especie);
    }

    if (pet.raca) {
        dados.push(pet.raca);
    }

    if (
        pet.idade !== null &&
        pet.idade !== undefined
    ) {
        dados.push(
            `${pet.idade} ano(s)`
        );
    }

    detalhes.textContent =
        dados.join(' • ');

    const descricao =
        document.createElement('p');

    descricao.className =
        'pet-description';

    descricao.textContent =
        pet.descricao || '';

    const tags =
        document.createElement('div');

    tags.className =
        'pet-tags';

    const tagsTexto = [];

    if (pet.microchipado) {
        tagsTexto.push(
            'Microchipado'
        );
    }

    if (pet.castrado) {
        tagsTexto.push(
            'Castrado'
        );
    }

    tags.textContent =
        tagsTexto.join(' • ');

    info.appendChild(nome);
    info.appendChild(owner);
    info.appendChild(detalhes);

    if (pet.descricao) {
        info.appendChild(descricao);
    }

    if (tagsTexto.length > 0) {
        info.appendChild(tags);
    }

    const actions =
        document.createElement('div');

    actions.className =
        'post-actions';

    const like =
        criarBotao(
            '♡',
            'Curtir'
        );

    like.addEventListener(
        'click',
        () => {
            like.classList.toggle(
                'liked'
            );

            const icon =
                like.querySelector(
                    '.action-circle'
                );

            icon.textContent =
                like.classList.contains(
                    'liked'
                )
                    ? '♥'
                    : '♡';
        }
    );

    const message =
        criarBotao(
            '💬',
            'Mensagem'
        );

    message.addEventListener(
        'click',
        () => {
            if (!pet.user_id) {
                return;
            }

            window.location.href =
                `mensagens.html?usuario=${encodeURIComponent(
                    pet.user_id
                )}`;
        }
    );

    const share =
        criarBotao(
            '↗',
            'Compartilhar'
        );

    share.addEventListener(
        'click',
        () => {
            compartilharPet(pet);
        }
    );

    const save =
        criarBotao(
            '🔖',
            'Salvar'
        );

    save.addEventListener(
        'click',
        () => {
            save.classList.toggle(
                'saved'
            );
        }
    );

    actions.appendChild(like);
    actions.appendChild(message);
    actions.appendChild(share);
    actions.appendChild(save);

    media.appendChild(info);
    media.appendChild(actions);

    post.appendChild(media);

    feed.appendChild(post);
}

function mostrarPlaceholder(
    container,
    pet
) {
    container.style.background =
        'linear-gradient(135deg, #FF7A29, #F26A15)';

    const placeholder =
        document.createElement('div');

    placeholder.style.position =
        'absolute';

    placeholder.style.inset = '0';

    placeholder.style.display =
        'flex';

    placeholder.style.alignItems =
        'center';

    placeholder.style.justifyContent =
        'center';

    placeholder.style.fontSize =
        '70px';

    placeholder.textContent =
        '🐾';

    container.appendChild(
        placeholder
    );
}

function criarBotao(
    icone,
    texto
) {
    const button =
        document.createElement('button');

    button.className = 'action';

    button.type = 'button';

    const circle =
        document.createElement('span');

    circle.className =
        'action-circle';

    circle.textContent =
        icone;

    const label =
        document.createElement('span');

    label.textContent =
        texto;

    button.appendChild(circle);
    button.appendChild(label);

    return button;
}

function mostrarMensagem(
    mensagem
) {
    if (!feed) {
        return;
    }

    feed.innerHTML = '';

    const mensagemElement =
        document.createElement('div');

    mensagemElement.className =
        'feed-loading';

    mensagemElement.textContent =
        mensagem;

    feed.appendChild(
        mensagemElement
    );
}

async function compartilharPet(pet) {
    const texto =
        `Conheça ${pet.nome || 'este pet'} para adoção!`;

    const url =
        `${window.location.origin}${window.location.pathname}?pet=${pet.id}`;

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
        }

        return;
    }

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

function configurarPesquisa() {
    const searchButton =
        document.getElementById(
            'searchBtn'
        );

    if (!searchButton) {
        return;
    }

    searchButton.addEventListener(
        'click',
        () => {
            alert(
                'Pesquisa de pets em breve.'
            );
        }
    );
}

async function iniciarFeed() {
    const logado =
        await verificarUsuario();

    if (!logado) {
        return;
    }

    configurarPesquisa();

    await carregarFeed();
}

iniciarFeed();