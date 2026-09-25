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

const messagesContainer =
    document.getElementById(
        'messagesContainer'
    );

const messageForm =
    document.getElementById(
        'messageForm'
    );

const messageInput =
    document.getElementById(
        'messageInput'
    );

const sendBtn =
    document.getElementById(
        'sendBtn'
    );

const userName =
    document.getElementById(
        'userName'
    );

const userAvatar =
    document.getElementById(
        'userAvatar'
    );

const backBtn =
    document.getElementById(
        'backBtn'
    );


// ============================================
// USUÁRIO DA URL
// ============================================

const params =
    new URLSearchParams(
        window.location.search
    );

const receiverId =
    params.get('usuario');


// ============================================
// VARIÁVEIS
// ============================================

let currentUser = null;

let receiverProfile = null;

let realtimeChannel = null;


// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener(
    'DOMContentLoaded',
    iniciarChat
);


async function iniciarChat() {

    if (!receiverId) {

        window.location.href =
            'conversas.html';

        return;
    }


    // ----------------------------------------
    // USUÁRIO LOGADO
    // ----------------------------------------

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


    // ----------------------------------------
    // NÃO PODE CONVERSAR CONSIGO MESMO
    // ----------------------------------------

    if (
        currentUser.id === receiverId
    ) {

        alert(
            'Você não pode iniciar uma conversa com você mesmo.'
        );

        window.location.href =
            'conversas.html';

        return;
    }


    // ----------------------------------------
    // PERFIL
    // ----------------------------------------

    await carregarPerfil();


    // ----------------------------------------
    // MENSAGENS
    // ----------------------------------------

    await carregarMensagens();


    // ----------------------------------------
    // REALTIME
    // ----------------------------------------

    iniciarRealtime();


    messageInput.focus();

}


// ============================================
// CARREGAR PERFIL
// ============================================

async function carregarPerfil() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('profiles')
            .select(`
                id,
                username,
                avatar_url,
                imagem_url
            `)
            .eq(
                'id',
                receiverId
            )
            .maybeSingle();


    if (error) {

        console.error(
            'Erro ao carregar perfil:',
            error
        );

        return;
    }


    if (!data) {

        alert(
            'Usuário não encontrado.'
        );

        window.location.href =
            'conversas.html';

        return;
    }


    receiverProfile =
        data;


    userName.textContent =
        data.username ||
        'Usuário';


    userAvatar.src =
        data.imagem_url ||
        data.avatar_url ||
        'https://placehold.co/100x100?text=Pet';


    userAvatar.onerror =
        () => {

            userAvatar.src =
                'https://placehold.co/100x100?text=Pet';

        };

}


// ============================================
// CARREGAR MENSAGENS
// ============================================

async function carregarMensagens() {

    messagesContainer.innerHTML = `
        <div class="loading">
            Carregando conversa...
        </div>
    `;


    const {
        data: messages,
        error
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
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
            )
            .order(
                'created_at',
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            'Erro ao carregar mensagens:',
            error
        );

        messagesContainer.innerHTML = `
            <div class="empty-chat">

                <div class="icon">
                    ⚠️
                </div>

                <strong>
                    Não foi possível carregar
                </strong>

                <span>
                    Tente novamente.
                </span>

            </div>
        `;

        return;
    }


    renderizarMensagens(
        messages || []
    );


    await marcarComoLidas();

}


// ============================================
// RENDERIZAR MENSAGENS
// ============================================

function renderizarMensagens(
    messages
) {

    messagesContainer.innerHTML = '';


    if (
        !messages ||
        messages.length === 0
    ) {

        messagesContainer.innerHTML = `

            <div class="empty-chat">

                <div class="icon">
                    💬
                </div>

                <strong>
                    Comece a conversa
                </strong>

                <span>
                    Mande uma mensagem para interagir
                    com ${escapeHtml(
                        receiverProfile?.username ||
                        'este usuário'
                    )}.
                </span>

            </div>

        `;

        return;
    }


    messages.forEach(
        message => {

            adicionarMensagemNaTela(
                message
            );

        }
    );


    scrollParaBaixo();

}


// ============================================
// ADICIONAR MENSAGEM
// ============================================

function adicionarMensagemNaTela(
    message
) {

    const row =
        document.createElement(
            'div'
        );


    const isMine =
        message.sender_id ===
        currentUser.id;


    row.className =
        `message-row ${
            isMine
                ? 'sent'
                : 'received'
        }`;


    const bubble =
        document.createElement(
            'div'
        );

    bubble.className =
        'message-bubble';


    const content =
        document.createElement(
            'span'
        );

    content.textContent =
        message.content;


    const time =
        document.createElement(
            'span'
        );

    time.className =
        'message-time';

    time.textContent =
        formatarHorario(
            message.created_at
        );


    bubble.appendChild(
        content
    );

    bubble.appendChild(
        time
    );

    row.appendChild(
        bubble
    );


    messagesContainer.appendChild(
        row
    );

}


// ============================================
// ENVIAR MENSAGEM
// ============================================

messageForm.addEventListener(
    'submit',
    async event => {

        event.preventDefault();


        const content =
            messageInput.value.trim();


        if (!content) {

            return;
        }


        if (!currentUser) {

            return;
        }


        sendBtn.disabled =
            true;


        messageInput.disabled =
            true;


        const {
            data,
            error
        } =
            await supabaseClient
                .from('messages')
                .insert({

                    sender_id:
                        currentUser.id,

                    receiver_id:
                        receiverId,

                    content:
                        content

                })
                .select()
                .single();


        if (error) {

            console.error(
                'Erro ao enviar mensagem:',
                error
            );

            alert(
                'Não foi possível enviar a mensagem.'
            );

            sendBtn.disabled =
                false;

            messageInput.disabled =
                false;

            return;
        }


        // limpa o campo

        messageInput.value =
            '';


        // adiciona imediatamente

        adicionarMensagemNaTela(
            data
        );


        scrollParaBaixo();


        sendBtn.disabled =
            false;

        messageInput.disabled =
            false;

        messageInput.focus();

    }
);


// ============================================
// MARCAR COMO LIDA
// ============================================

async function marcarComoLidas() {

    if (!currentUser) {

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from('messages')
            .update({
                read_at:
                    new Date().toISOString()
            })
            .eq(
                'sender_id',
                receiverId
            )
            .eq(
                'receiver_id',
                currentUser.id
            )
            .is(
                'read_at',
                null
            );


    if (error) {

        console.error(
            'Erro ao marcar mensagens como lidas:',
            error
        );

    }

}


// ============================================
// REALTIME
// ============================================

function iniciarRealtime() {

    realtimeChannel =
        supabaseClient
            .channel(
                `chat-${currentUser.id}-${receiverId}`
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                payload => {

                    const message =
                        payload.new;


                    const pertenceAoChat =
                        (
                            message.sender_id ===
                                currentUser.id &&
                            message.receiver_id ===
                                receiverId
                        )
                        ||
                        (
                            message.sender_id ===
                                receiverId &&
                            message.receiver_id ===
                                currentUser.id
                        );


                    if (
                        !pertenceAoChat
                    ) {

                        return;
                    }


                    // Se foi uma mensagem
                    // recebida, marca como lida.

                    if (
                        message.sender_id ===
                        receiverId
                    ) {

                        marcarMensagemComoLida(
                            message.id
                        );

                    }


                    // Evita duplicar a mensagem
                    // que já foi adicionada pelo
                    // envio local.

                    const existente =
                        [...messagesContainer.querySelectorAll(
                            '.message-bubble'
                        )].some(
                            bubble =>
                                bubble.dataset.messageId ===
                                message.id
                        );


                    if (
                        existente
                    ) {

                        return;
                    }


                    adicionarMensagemRealtime(
                        message
                    );

                }
            )
            .subscribe();

}


// ============================================
// MENSAGEM RECEBIDA EM TEMPO REAL
// ============================================

function adicionarMensagemRealtime(
    message
) {

    const row =
        document.createElement(
            'div'
        );


    const bubble =
        document.createElement(
            'div'
        );


    row.className =
        'message-row received';

    bubble.className =
        'message-bubble';

    bubble.dataset.messageId =
        message.id;


    const content =
        document.createElement(
            'span'
        );

    content.textContent =
        message.content;


    const time =
        document.createElement(
            'span'
        );

    time.className =
        'message-time';

    time.textContent =
        formatarHorario(
            message.created_at
        );


    bubble.appendChild(
        content
    );

    bubble.appendChild(
        time
    );

    row.appendChild(
        bubble
    );


    messagesContainer.appendChild(
        row
    );


    scrollParaBaixo();

}


// ============================================
// MARCAR UMA MENSAGEM COMO LIDA
// ============================================

async function marcarMensagemComoLida(
    messageId
) {

    await supabaseClient
        .from('messages')
        .update({
            read_at:
                new Date().toISOString()
        })
        .eq(
            'id',
            messageId
        );

}


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


    return date.toLocaleTimeString(
        'pt-BR',
        {
            hour: '2-digit',
            minute: '2-digit'
        }
    );

}


// ============================================
// SCROLL
// ============================================

function scrollParaBaixo() {

    requestAnimationFrame(
        () => {

            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;

        }
    );

}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            'div'
        );

    div.textContent =
        value;

    return div.innerHTML;

}


// ============================================
// VOLTAR
// ============================================

backBtn.addEventListener(
    'click',
    () => {

        window.location.href =
            'conversas.html';

    }
);


// ============================================
// ANEXO
// ============================================

document
    .getElementById('attachmentBtn')
    .addEventListener(
        'click',
        () => {

            alert(
                'Envio de arquivos será adicionado posteriormente.'
            );

        }
    );


// ============================================
// MENU
// ============================================

document
    .getElementById('menuBtn')
    .addEventListener(
        'click',
        () => {

            alert(
                'Opções da conversa.'
            );

        }
    );
