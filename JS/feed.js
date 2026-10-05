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

const petSelecionado =
    new URLSearchParams(
        window.location.search
    ).get('pet');

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

    const {
        data: likes,
        error: likesError
    } = await supabaseClient
        .from('likes')
        .select('pet_id')
        .eq(
            'user_id',
            currentUser.id
        );
    
    if (likesError) {
    
        console.error(
            'Erro ao carregar curtidas:',
            likesError
        );
    
    }
    
    const petsCurtidos = new Set(
        (likes || []).map(
            like => like.pet_id
        )
    );


    const userIds = [
        ...new Set(
            pets
                .map(pet => pet.user_id)
                .filter(Boolean)
        )
    ];
    
    let profiles = [];
    
    if (userIds.length > 0) {
    
        const {
            data: profilesData,
            error: profilesError
        } = await supabaseClient
            .from('profiles')
            .select(`
                id,
                username,
                avatar_url
            `)
            .in(
                'id',
                userIds
            );
    
        if (profilesError) {
    
            console.error(
                'Erro ao carregar perfis:',
                profilesError
            );
    
        } else {
    
            profiles =
                profilesData || [];
    
        }
    }



    feed.innerHTML = '';

    pets.forEach((pet) => {

        const profile =
            profiles.find(
                profile =>
                    profile.id === pet.user_id
            );
    
        criarPublicacao(
            pet,
            profile,
            petsCurtidos.has(pet.id)
        );
    });
    
    if (petSelecionado) {
        setTimeout(() => {
    
            const publicacao =
                document.querySelector(
                    `.feed-post[data-pet-id="${petSelecionado}"]`
                );
    
            if (publicacao) {
    
                publicacao.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
    
                publicacao.classList.add(
                    'post-destacado'
                );
    
                setTimeout(() => {
                    publicacao.classList.remove(
                        'post-destacado'
                    );
                }, 2000);
            }
    
        }, 100);
    }
    
}
function configurarAudioDosVideos() {
    if (!feed) {
        return;
    }

    let videoAtivo = null;

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(entry => {

                    const video =
                        entry.target;

                    if (entry.isIntersecting) {

                        /*
                         * Se já existe outro vídeo tocando,
                         * pausa e deixa sem som.
                         */
                        if (
                            videoAtivo &&
                            videoAtivo !== video
                        ) {

                            videoAtivo.pause();

                            videoAtivo.muted = true;

                            videoAtivo.currentTime = 0;
                        }

                        /*
                         * Esse passa a ser o vídeo ativo.
                         */
                        videoAtivo = video;

                        /*
                         * Sempre começa do início
                         * quando entra na tela.
                         */
                        video.currentTime = 0;

                        video.muted = false;

                        video.volume = 1;

                        video.play().catch(error => {

                            /*
                             * Se o navegador bloquear
                             * o áudio automático,
                             * mantém o vídeo sem som.
                             */
                            console.log(
                                'Autoplay com áudio bloqueado:',
                                error
                            );

                            video.muted = true;

                            video.play().catch(() => {});
                        });

                    } else {

                        /*
                         * Saiu da tela:
                         * pausa e volta para o começo.
                         */
                        video.pause();

                        video.muted = true;

                        video.currentTime = 0;

                        if (
                            videoAtivo === video
                        ) {
                            videoAtivo = null;
                        }
                    }
                });
            },
            {
                root: feed,

                /*
                 * Só considera ativo quando
                 * pelo menos 70% do vídeo está visível.
                 */
                threshold: 0.7
            }
        );


    function observarVideos() {

        const videos =
            feed.querySelectorAll(
                'video'
            );

        videos.forEach(video => {

            if (
                video.dataset.audioConfigurado
            ) {
                return;
            }

            video.dataset.audioConfigurado =
                'true';

            video.autoplay = false;

            video.muted = true;

            video.loop = true;

            video.playsInline = true;

            video.setAttribute(
                'playsinline',
                ''
            );
            video.addEventListener(
    'click',
    () => {

        if (video.paused) {

            // Se o vídeo estava pausado,
            // continua de onde parou
            video.muted = false;

            video.play().catch(() => {
                video.muted = true;
                video.play().catch(() => {});
            });

        } else {

            // Pausa o vídeo
            video.pause();
        }

    }
);


            observer.observe(video);
        });
    }


    observarVideos();


    /*
     * Observa os clones criados pelo
     * sistema de loop infinito.
     */
    const mutationObserver =
        new MutationObserver(() => {

            observarVideos();

        });


    mutationObserver.observe(
        feed,
        {
            childList: true,
            subtree: true
        }
    );
}


function configurarLoopFeed() {
    if (!feed) {
        return;
    }

    let postsOriginais = [
        ...feed.querySelectorAll('.feed-post')
    ];

    if (postsOriginais.length < 2) {
        return;
    }

    // Remove clones antigos
    feed.querySelectorAll('.feed-post-clone')
        .forEach(clone => clone.remove());

    /*
     * Criamos uma cópia ANTES dos posts originais
     * e outra DEPOIS.
     *
     * Fica assim:
     *
     * [1] [2] [3] [4]
     * [1] [2] [3] [4]
     * [1] [2] [3] [4]
     *
     * O usuário começa no bloco do meio.
     */

    const alturaOriginal =
        postsOriginais.reduce(
            (total, post) =>
                total + post.offsetHeight,
            0
        );

    // =========================
    // CLONES DO FINAL
    // =========================

    const clonesAntes =
        postsOriginais.map(post => {

            const clone =
                post.cloneNode(true);

            clone.classList.add(
                'feed-post-clone'
            );

            return clone;
        });

    // Coloca os clones do último bloco
    // antes dos posts originais
    clonesAntes
        .reverse()
        .forEach(clone => {
            feed.prepend(clone);
        });

    // =========================
    // CLONES DO COMEÇO
    // =========================

    postsOriginais.forEach(post => {

        const clone =
            post.cloneNode(true);

        clone.classList.add(
            'feed-post-clone'
        );

        feed.appendChild(clone);
    });

    /*
     * Agora existem 3 blocos:
     *
     * bloco anterior
     * bloco original
     * bloco seguinte
     *
     * Começamos exatamente no bloco original.
     */

    feed.scrollTop =
        alturaOriginal;

    let ajustando = false;

    feed.addEventListener(
        'scroll',
        () => {

            if (ajustando) {
                return;
            }

            /*
             * Se passou para o bloco seguinte,
             * volta exatamente um bloco.
             *
             * Para o usuário parece que
             * continuou normalmente.
             */

            if (
                feed.scrollTop >=
                alturaOriginal * 2
            ) {

                ajustando = true;

                feed.scrollTop -=
                    alturaOriginal;

                requestAnimationFrame(() => {
                    ajustando = false;
                });

                return;
            }

            /*
             * Se voltou para o bloco anterior,
             * avança exatamente um bloco.
             *
             * Assim também existe loop
             * de baixo para cima.
             */

            if (
                feed.scrollTop <= 0
            ) {

                ajustando = true;

                feed.scrollTop +=
                    alturaOriginal;

                requestAnimationFrame(() => {
                    ajustando = false;
                });
            }
        }
    );
}


function criarPublicacao(
    pet,
    profile,
    jaCurtido = false,
) {
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

video.src =
    pet.media_url;

video.className =
    'post-media';

video.loop = true;

video.muted = true;

video.playsInline = true;

video.setAttribute(
    'playsinline',
    '');

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
    
    owner.style.display = 'flex';
    owner.style.alignItems = 'center';
    owner.style.gap = '10px';
    owner.style.cursor = 'pointer';
    
    const ownerAvatar =
        document.createElement('img');
    
    ownerAvatar.src =
        profile?.avatar_url ||
        'IMG/avatar-default.png';
    
    ownerAvatar.alt =
        profile?.username || 'Usuário';
    
    ownerAvatar.style.width = '40px';
    ownerAvatar.style.height = '40px';
    ownerAvatar.style.borderRadius = '50%';
    ownerAvatar.style.objectFit = 'cover';
    
    const ownerUsername =
        document.createElement('span');
    
    ownerUsername.textContent =
        profile?.username || 'Usuário';
    
    ownerUsername.style.fontWeight = '600';
    
    owner.appendChild(ownerAvatar);
    owner.appendChild(ownerUsername);
    
    owner.addEventListener(
        'click',
        () => {
    
            if (!pet.user_id) {
                return;
            }
    
            window.location.href =
                `perfil.html?id=${encodeURIComponent(
                    pet.user_id
                )}`;
        }
    );

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
        jaCurtido ? '♥' : '♡',
        'Curtir'
    );

if (jaCurtido) {
    like.classList.add('liked');
}
    
    like.addEventListener(
        'click',
        async () => {
    
            await alternarLike(
                pet.id,
                like
            );
    
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
    `chat.html?usuario=${encodeURIComponent(
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

async function alternarLike(
    petId,
    button
) {
    if (!currentUser) {

        alert(
            'Você precisa estar logado para curtir.'
        );

        return;
    }

    button.disabled = true;


    // Verifica se o usuário já curtiu esse pet
    const {
        data: likeExistente,
        error: buscaError
    } = await supabaseClient
        .from('likes')
        .select('pet_id')
        .eq(
            'pet_id',
            petId
        )
        .eq(
            'user_id',
            currentUser.id
        )
        .maybeSingle();


    if (buscaError) {

        console.error(
            'Erro ao verificar curtida:',
            buscaError
        );

        button.disabled = false;

        return;
    }


    // =========================
    // DESCURTIR
    // =========================

    if (likeExistente) {

        const {
            error: deleteError
        } = await supabaseClient
            .from('likes')
            .delete()
            .eq(
                'pet_id',
                petId
            )
            .eq(
                'user_id',
                currentUser.id
            );


        if (deleteError) {

            console.error(
                'Erro ao remover curtida:',
                deleteError
            );

            alert(
                'Não foi possível remover a curtida.'
            );

        } else {

            button.classList.remove(
                'liked'
            );

            const icon =
                button.querySelector(
                    '.action-circle'
                );

            if (icon) {
                icon.textContent =
                    '♡';
            }
        }


    } else {

        // =========================
        // CURTIR
        // =========================

        const {
            error: insertError
        } = await supabaseClient
            .from('likes')
            .insert({
                pet_id:
                    petId,

                user_id:
                    currentUser.id
            });


        if (insertError) {

            console.error(
                'Erro ao salvar curtida:',
                insertError
            );

            alert(
                'Não foi possível curtir a publicação.'
            );

        } else {

            button.classList.add(
                'liked'
            );

            const icon =
                button.querySelector(
                    '.action-circle'
                );

            if (icon) {
                icon.textContent =
                    '♥';
            }
        }
    }


    button.disabled = false;
}



async function iniciarFeed() {
    const logado =
        await verificarUsuario();

    if (!logado) {
        return;
    }

    configurarPesquisa();
    await carregarFeed();
    configurarAudioDosVideos();
    configurarLoopFeed();
}

iniciarFeed();