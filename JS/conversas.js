// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL =
    'https://blpueqrzgqypkabjnvlu.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ============================================
// ELEMENTOS
// ============================================

const conversationList =
    document.getElementById(
        'conversationList'
    );

const searchInput =
    document.getElementById(
        'searchInput'
    );


// ============================================
// VARIÁVEIS
// ============================================

let currentUser = null;

let conversations = [];
let onlineUsers = new Set();
let presenceChannel = null;


// ============================================
// INICIAR
// ============================================

document.addEventListener(
    'DOMContentLoaded',
    iniciar
);


async function iniciar() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getUser();


    if (
        error ||
        !data ||
        !data.user
    ) {

        window.location.href =
            'index.html';

        return;
    }


    currentUser =
    data.user;

await iniciarPresenca();

await carregarConversas();

iniciarRealtime();

}


// ============================================
// CARREGAR
// ============================================

async function carregarConversas() {

    conversationList.innerHTML = `
        <div class="loading">
            Carregando conversas...
        </div>
    `;


    // ----------------------------------------
    // TODOS OS PERFIS
    // ----------------------------------------

    const {
        data: profiles,
        error: profileError
    } =
        await supabaseClient
            .from('profiles')
            .select(`
                id,
                username,
                avatar_url,
                imagem_url
            `)
            .neq(
                'id',
                currentUser.id
            )
            .order(
                'username',
                {
                    ascending: true
                }
            );


    if (profileError) {

        console.error(
            profileError
        );

        mostrarErro();

        return;
    }


    // ----------------------------------------
    // TODAS AS MENSAGENS DO USUÁRIO
    // ----------------------------------------

    const {
        data: messages,
        error: messageError
    } =
        await supabaseClient
            .from('messages')
            .select(`
                id,
                sender_id,
                receiver_id,
                content,
                created_at,
                read_at
            `)
            .or(
                `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            );


    if (messageError) {

        console.error(
            messageError
        );

        mostrarErro();

        return;
    }


    // ----------------------------------------
    // MONTAR LISTA
    // ----------------------------------------

    conversations =
    profiles
        .map(
            profile => {

                const userMessages =
                    messages.filter(
                        message =>
                            message.sender_id ===
                                profile.id ||
                            message.receiver_id ===
                                profile.id
                    );


                // NÃO criar conversa se não houver mensagem
                if (userMessages.length === 0) {
                    return null;
                }


                const lastMessage =
                    userMessages[0];


                const unreadCount =
                    userMessages.filter(
                        message =>
                            message.sender_id ===
                                profile.id &&
                            message.receiver_id ===
                                currentUser.id &&
                            !message.read_at
                    ).length;


                return {
                    profile,
                    lastMessage,
                    unreadCount
                };

            }
        )
        .filter(
            conversation =>
                conversation !== null
        );


    // ----------------------------------------
    // COLOCAR CONVERSAS COM MENSAGENS
    // PRIMEIRO
    // ----------------------------------------

    conversations.sort(
        (a, b) => {

            if (
                a.lastMessage &&
                !b.lastMessage
            ) {

                return -1;

            }

            if (
                !a.lastMessage &&
                b.lastMessage
            ) {

                return 1;

            }

            if (
                a.lastMessage &&
                b.lastMessage
            ) {

                return new Date(
                    b.lastMessage.created_at
                ) -
                new Date(
                    a.lastMessage.created_at
                );

            }

            return (
                a.profile.username || ''
            ).localeCompare(
                b.profile.username || ''
            );

        }
    );


    renderizar(
        conversations
    );

}


// ============================================
// RENDERIZAR
// ============================================

function renderizar(
    lista
) {

    conversationList.innerHTML =
        '';


    if (!lista.length) {

        conversationList.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    💬
                </div>

                <h2>
                    Nenhum usuário
                </h2>

                <p>
                    Ainda não existem outros usuários
                    para iniciar uma conversa.
                </p>

            </div>

        `;

        return;
    }


    lista.forEach(
        conversation => {

            const item =
                criarItem(
                    conversation
                );

            conversationList.appendChild(
                item
            );

        }
    );

}


// ============================================
// CRIAR ITEM
// ============================================

function criarItem(
    conversation
) {

    const {
        profile,
        lastMessage,
        unreadCount
    } =
        conversation;


    const item =
        document.createElement(
            'div'
        );

    item.className =
        'conversation-item';


    // ----------------------------------------
    // AVATAR
    // ----------------------------------------

    const avatarWrapper =
        document.createElement(
            'div'
        );

    avatarWrapper.className =
        'avatar-wrapper';


    const avatar =
        document.createElement(
            'img'
        );

    avatar.className =
        'avatar';

    avatar.src =
        profile.imagem_url ||
        profile.avatar_url ||
        'https://placehold.co/100x100?text=Pet';

    avatar.alt =
        profile.username ||
        'Usuário';


    avatar.onerror =
        () => {

            avatar.src =
                'https://placehold.co/100x100?text=Pet';

        };


    avatarWrapper.appendChild(
        avatar
    );


    // ----------------------------------------
    // ONLINE
    // ----------------------------------------

    const online =
    document.createElement(
        'span'
    );

    online.className =
    'online-dot';

    if (!onlineUsers.has(profile.id)) {
        online.classList.add('offline');
    }

    avatarWrapper.appendChild(
        online
    );


    // ----------------------------------------
    // INFORMAÇÕES
    // ----------------------------------------

    const info =
        document.createElement(
            'div'
        );

    info.className =
        'conversation-info';


    const name =
        document.createElement(
            'div'
        );

    name.className =
        'conversation-name';

    name.textContent =
        profile.username ||
        'Usuário';


    const last =
        document.createElement(
            'div'
        );

    last.className =
        'last-message';


    if (lastMessage) {

        last.textContent =
            lastMessage.content;

    } else {

        last.textContent =
            'Mande uma mensagem para interagir';

    }


    info.appendChild(
        name
    );

    info.appendChild(
        last
    );


    // ----------------------------------------
    // META
    // ----------------------------------------

    const meta =
        document.createElement(
            'div'
        );

    meta.className =
        'conversation-meta';


    if (lastMessage) {

        const time =
            document.createElement(
                'span'
            );

        time.className =
            'message-time';

        time.textContent =
            formatarHorario(
                lastMessage.created_at
            );

        meta.appendChild(
            time
        );

    }


    if (
        unreadCount > 0
    ) {

        const badge =
            document.createElement(
                'span'
            );

        badge.className =
            'unread-badge';

        badge.textContent =
            unreadCount > 99
                ? '99+'
                : unreadCount;

        meta.appendChild(
            badge
        );

    }


    // ----------------------------------------
    // MONTAR
    // ----------------------------------------

    item.appendChild(
        avatarWrapper
    );

    item.appendChild(
        info
    );

    item.appendChild(
        meta
    );


    // ----------------------------------------
    // ABRIR
    // ----------------------------------------

    item.addEventListener(
        'click',
        () => {

            window.location.href =
                `chat.html?usuario=${encodeURIComponent(
                    profile.id
                )}`;

        }
    );


    return item;

}


// ============================================
// BUSCA
// ============================================

searchInput.addEventListener(
    'input',
    () => {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!search) {

            renderizar(
                conversations
            );

            return;
        }


        const filtered =
            conversations.filter(
                conversation => {

                    return (
                        conversation.profile.username ||
                        ''
                    )
                        .toLowerCase()
                        .includes(search);

                }
            );


        renderizar(
            filtered
        );

    }
);


// ============================================
// HORÁRIO
// ============================================

function formatarHorario(
    dateString
) {

    const date =
        new Date(
            dateString
        );

    const now =
        new Date();


    if (
        date.toDateString() ===
        now.toDateString()
    ) {

        return date.toLocaleTimeString(
            'pt-BR',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );

    }


    return date.toLocaleDateString(
        'pt-BR',
        {
            day: '2-digit',
            month: '2-digit'
        }
    );

}


// ============================================
// ERRO
// ============================================

function mostrarErro() {

    conversationList.innerHTML = `

        <div class="error-message">

            Não foi possível carregar
            suas conversas.

        </div>

    `;

}


// ============================================
// REALTIME DA LISTA
// ============================================

function iniciarRealtime() {

    supabaseClient
        .channel(
            'conversations-list'
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'messages'
            },
            async () => {

                await carregarConversas();

            }
        )
        .subscribe();

}

async function iniciarPresenca() {

    presenceChannel =
        supabaseClient.channel(
            'usuarios-online',
            {
                config: {
                    presence: {
                        key: currentUser.id
                    }
                }
            }
        );


    presenceChannel.on(
        'presence',
        {
            event: 'sync'
        },
        () => {

            const state =
                presenceChannel.presenceState();

            onlineUsers =
                new Set(
                    Object.keys(state)
                );


            renderizar(
                conversations
            );

        }
    );


    await presenceChannel.subscribe(
        async status => {

            if (status === 'SUBSCRIBED') {

                await presenceChannel.track({
                    user_id:
                        currentUser.id,

                    online_at:
                        new Date().toISOString()
                });

            }

        }
    );

}