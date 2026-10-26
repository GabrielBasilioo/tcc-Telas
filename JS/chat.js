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

const MEDIA_BUCKET = 'chat-media';

const LIMITE_IMAGEM_MB = 10;
const LIMITE_VIDEO_MB = 50;


// ============================================
// ELEMENTOS
// ============================================

const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const backBtn = document.getElementById('backBtn');
const attachmentBtn = document.getElementById('attachmentBtn');


// ---- elementos criados por JS (não precisa mexer no HTML) ----

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*,video/*';
fileInput.hidden = true;
document.body.appendChild(fileInput);

const mediaPreview = document.createElement('div');
mediaPreview.className = 'media-preview';
mediaPreview.hidden = true;
document.querySelector('.phone').appendChild(mediaPreview);

const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.hidden = true;
lightbox.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Fechar">×</button>
    <img alt="Foto ampliada">
`;
document.body.appendChild(lightbox);


// ============================================
// USUÁRIO DA URL
// ============================================

const params = new URLSearchParams(window.location.search);
const receiverId = params.get('usuario');


// ============================================
// VARIÁVEIS
// ============================================

let currentUser = null;
let receiverProfile = null;

let realtimeChannel = null;
let presenceChannel = null;
let receiverOnline = false;

let arquivoSelecionado = null;
let previewUrl = null;


// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', iniciarChat);


async function iniciarChat() {

    if (!receiverId) {
        window.location.href = 'conversas.html';
        return;
    }

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data || !data.user) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = data.user;

    if (currentUser.id === receiverId) {
        alert('Você não pode iniciar uma conversa com você mesmo.');
        window.location.href = 'conversas.html';
        return;
    }

    await carregarPerfil();
    await iniciarPresenca();
    await carregarMensagens();
    iniciarRealtime();

    messageInput.focus();
}


// ============================================
// PRESENÇA
// ============================================

async function iniciarPresenca() {

    presenceChannel =
        supabaseClient.channel('usuarios-online', {
            config: {
                presence: { key: currentUser.id }
            }
        });

    presenceChannel.on('presence', { event: 'sync' }, () => {

        const state = presenceChannel.presenceState();
        const onlineUsers = new Set();

        Object.values(state).forEach(presences => {
            presences.forEach(presence => {
                if (presence.user_id) {
                    onlineUsers.add(presence.user_id);
                }
            });
        });

        receiverOnline = onlineUsers.has(receiverId);
        atualizarStatusUsuario();
    });

    await presenceChannel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: currentUser.id });
        }
    });
}

function atualizarStatusUsuario() {

    const status = document.querySelector('.chat-user-info span');
    const dot = document.querySelector('.online-dot');

    if (!status || !dot) {
        return;
    }

    if (receiverOnline) {
        dot.classList.remove('offline');
        status.lastChild.textContent = 'Online';
    } else {
        dot.classList.add('offline');
        status.lastChild.textContent = 'Offline';
    }
}


// ============================================
// CARREGAR PERFIL
// ============================================

async function carregarPerfil() {

    const { data, error } =
        await supabaseClient
            .from('profiles')
            .select(`
                id,
                username,
                avatar_url,
                imagem_url
            `)
            .eq('id', receiverId)
            .maybeSingle();

    if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
    }

    if (!data) {
        alert('Usuário não encontrado.');
        window.location.href = 'conversas.html';
        return;
    }

    receiverProfile = data;

    userName.textContent = data.username || 'Usuário';

    userAvatar.src =
        data.imagem_url ||
        data.avatar_url ||
        'https://placehold.co/100x100?text=Pet';

    userAvatar.onerror = () => {
        userAvatar.src = 'https://placehold.co/100x100?text=Pet';
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

    const { data: messages, error } =
        await supabaseClient
            .from('messages')
            .select(`
                id,
                sender_id,
                receiver_id,
                content,
                media_url,
                media_type,
                created_at,
                read_at
            `)
            .or(
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
            )
            .order('created_at', { ascending: true });

    if (error) {

        console.error('Erro ao carregar mensagens:', error);

        messagesContainer.innerHTML = `
            <div class="empty-chat">
                <div class="icon">⚠️</div>
                <strong>Não foi possível carregar</strong>
                <span>Tente novamente.</span>
            </div>
        `;

        return;
    }

    renderizarMensagens(messages || []);

    await marcarComoLidas();
}


// ============================================
// RENDERIZAR MENSAGENS
// ============================================

function renderizarMensagens(messages) {

    messagesContainer.innerHTML = '';

    if (!messages || messages.length === 0) {

        messagesContainer.innerHTML = `
            <div class="empty-chat">
                <div class="icon">💬</div>
                <strong>Comece a conversa</strong>
                <span>
                    Mande uma mensagem para interagir
                    com ${escapeHtml(
                        receiverProfile?.username || 'este usuário'
                    )}.
                </span>
            </div>
        `;

        return;
    }

    messages.forEach(message => adicionarMensagemNaTela(message));

    scrollParaBaixo();
}


// ============================================
// CRIAR / ADICIONAR MENSAGEM (texto, foto ou vídeo)
// ============================================

function criarElementoMensagem(message) {

    const row = document.createElement('div');
    const isMine = message.sender_id === currentUser.id;

    row.className = `message-row ${isMine ? 'sent' : 'received'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.dataset.messageId = message.id;

    const temMidia = !!message.media_url;
    const temTexto = !!(message.content && message.content.trim());

    if (temMidia) {

        bubble.classList.add('has-media');

        if (!temTexto) {
            bubble.classList.add('no-caption');
        }

        if (message.media_type === 'video') {

            const video = document.createElement('video');
            video.className = 'media-item';
            video.src = message.media_url;
            video.controls = true;
            video.preload = 'metadata';
            video.playsInline = true;
            bubble.appendChild(video);

        } else {

            const img = document.createElement('img');
            img.className = 'media-item';
            img.src = message.media_url;
            img.alt = 'Foto enviada';
            img.loading = 'lazy';
            img.addEventListener('click', () => abrirLightbox(message.media_url));
            img.addEventListener('load', scrollParaBaixo);
            bubble.appendChild(img);
        }
    }

    if (temTexto) {

        const content = document.createElement('span');

        if (temMidia) {
            content.className = 'media-caption';
        }

        content.textContent = message.content;
        bubble.appendChild(content);
    }

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatarHorario(message.created_at);
    bubble.appendChild(time);

    row.appendChild(bubble);

    return row;
}

function adicionarMensagemNaTela(message) {

    // remove o aviso "Comece a conversa" se existir
    const vazio = messagesContainer.querySelector('.empty-chat');
    if (vazio) {
        vazio.remove();
    }

    messagesContainer.appendChild(criarElementoMensagem(message));
}

// mantido o nome usado pelo realtime
function adicionarMensagemRealtime(message) {
    adicionarMensagemNaTela(message);
    scrollParaBaixo();
}


// ============================================
// ANEXO: ESCOLHER ARQUIVO
// ============================================

attachmentBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
});

fileInput.addEventListener('change', () => {

    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    const ehImagem = file.type.startsWith('image/');
    const ehVideo = file.type.startsWith('video/');

    if (!ehImagem && !ehVideo) {
        alert('Escolha uma foto ou um vídeo.');
        return;
    }

    const limiteMB = ehVideo ? LIMITE_VIDEO_MB : LIMITE_IMAGEM_MB;

    if (file.size > limiteMB * 1024 * 1024) {
        alert(
            `${ehVideo ? 'O vídeo' : 'A foto'} é muito grande. ` +
            `O limite é de ${limiteMB} MB.`
        );
        return;
    }

    arquivoSelecionado = file;
    mostrarPreview(file);
    messageInput.focus();
});


function mostrarPreview(file) {

    limparPreviewUrl();
    previewUrl = URL.createObjectURL(file);

    const ehVideo = file.type.startsWith('video/');
    const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);

    mediaPreview.innerHTML = '';

    const thumb = document.createElement(ehVideo ? 'video' : 'img');
    thumb.className = 'preview-thumb';
    thumb.src = previewUrl;

    if (ehVideo) {
        thumb.muted = true;
        thumb.preload = 'metadata';
    }

    const info = document.createElement('div');
    info.className = 'preview-info';

    const nome = document.createElement('div');
    nome.textContent = file.name;
    nome.style.overflow = 'hidden';
    nome.style.textOverflow = 'ellipsis';
    nome.style.whiteSpace = 'nowrap';

    const detalhe = document.createElement('small');
    detalhe.textContent =
        `${ehVideo ? 'Vídeo' : 'Foto'} · ${tamanhoMB} MB · adicione uma legenda abaixo (opcional)`;

    info.appendChild(nome);
    info.appendChild(detalhe);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'preview-remove';
    remover.setAttribute('aria-label', 'Remover arquivo');
    remover.textContent = '×';
    remover.addEventListener('click', removerArquivoSelecionado);

    mediaPreview.appendChild(thumb);
    mediaPreview.appendChild(info);
    mediaPreview.appendChild(remover);

    mediaPreview.hidden = false;

    messageInput.placeholder = 'Adicionar legenda...';
}

function limparPreviewUrl() {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }
}

function removerArquivoSelecionado() {
    arquivoSelecionado = null;
    fileInput.value = '';
    limparPreviewUrl();
    mediaPreview.hidden = true;
    mediaPreview.innerHTML = '';
    messageInput.placeholder = 'Digite uma mensagem';
}


// ============================================
// UPLOAD
// ============================================

async function enviarArquivo(file) {

    const partes = file.name.split('.');
    const ext =
        partes.length > 1
            ? partes.pop().toLowerCase().replace(/[^a-z0-9]/g, '')
            : 'bin';

    const nomeUnico =
        (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));

    // a pasta é o id do usuário (exigido pela política do bucket)
    const path = `${currentUser.id}/${nomeUnico}.${ext}`;

    const { error } =
        await supabaseClient
            .storage
            .from(MEDIA_BUCKET)
            .upload(path, file, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

    if (error) {
        throw error;
    }

    const { data } =
        supabaseClient
            .storage
            .from(MEDIA_BUCKET)
            .getPublicUrl(path);

    return {
        path,
        url: data.publicUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image'
    };
}


// ============================================
// ENVIAR MENSAGEM
// ============================================

messageForm.addEventListener('submit', async event => {

    event.preventDefault();

    const content = messageInput.value.trim();

    if (!content && !arquivoSelecionado) {
        return;
    }

    if (!currentUser) {
        return;
    }

    sendBtn.disabled = true;
    messageInput.disabled = true;
    attachmentBtn.disabled = true;

    let upload = null;

    try {

        if (arquivoSelecionado) {
            messageInput.placeholder = 'Enviando arquivo...';
            upload = await enviarArquivo(arquivoSelecionado);
        }

        const novaMensagem = {
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content: content
        };

        if (upload) {
            novaMensagem.media_url = upload.url;
            novaMensagem.media_type = upload.type;
        }

        const { data, error } =
            await supabaseClient
                .from('messages')
                .insert(novaMensagem)
                .select()
                .single();

        if (error) {

            // se a mensagem falhou, apaga o arquivo que subiu
            if (upload) {
                await supabaseClient
                    .storage
                    .from(MEDIA_BUCKET)
                    .remove([upload.path]);
            }

            throw error;
        }

        messageInput.value = '';
        removerArquivoSelecionado();

        // evita duplicar caso o realtime chegue primeiro
        const jaExiste = [...messagesContainer.querySelectorAll('.message-bubble')]
            .some(b => b.dataset.messageId === String(data.id));

        if (!jaExiste) {
            adicionarMensagemNaTela(data);
        }

        scrollParaBaixo();

    } catch (error) {

        console.error('Erro ao enviar mensagem:', error);
        alert('Não foi possível enviar a mensagem.');
        messageInput.placeholder =
            arquivoSelecionado ? 'Adicionar legenda...' : 'Digite uma mensagem';

    } finally {

        sendBtn.disabled = false;
        messageInput.disabled = false;
        attachmentBtn.disabled = false;
        messageInput.focus();
    }
});


// ============================================
// MARCAR COMO LIDA
// ============================================

async function marcarComoLidas() {

    if (!currentUser) {
        return;
    }

    const { error } =
        await supabaseClient
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('sender_id', receiverId)
            .eq('receiver_id', currentUser.id)
            .is('read_at', null);

    if (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
    }
}


// ============================================
// REALTIME
// ============================================

function iniciarRealtime() {

    realtimeChannel =
        supabaseClient
            .channel(`chat-${currentUser.id}-${receiverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                payload => {

                    const message = payload.new;

                    const pertenceAoChat =
                        (
                            message.sender_id === currentUser.id &&
                            message.receiver_id === receiverId
                        ) ||
                        (
                            message.sender_id === receiverId &&
                            message.receiver_id === currentUser.id
                        );

                    if (!pertenceAoChat) {
                        return;
                    }

                    if (message.sender_id === receiverId) {
                        marcarMensagemComoLida(message.id);
                    }

                    const existente =
                        [...messagesContainer.querySelectorAll('.message-bubble')]
                            .some(
                                bubble =>
                                    bubble.dataset.messageId ===
                                    String(message.id)
                            );

                    if (existente) {
                        return;
                    }

                    adicionarMensagemRealtime(message);
                }
            )
            .subscribe();
}


async function marcarMensagemComoLida(messageId) {

    await supabaseClient
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
}


// ============================================
// LIGHTBOX (foto em tela cheia)
// ============================================

function abrirLightbox(url) {
    lightbox.querySelector('img').src = url;
    lightbox.hidden = false;
}

function fecharLightbox() {
    lightbox.hidden = true;
    lightbox.querySelector('img').src = '';
}

lightbox.addEventListener('click', event => {
    if (event.target.tagName !== 'IMG') {
        fecharLightbox();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !lightbox.hidden) {
        fecharLightbox();
    }
});


// ============================================
// HORÁRIO
// ============================================

function formatarHorario(dateString) {

    const date = new Date(dateString);

    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}


// ============================================
// SCROLL
// ============================================

function scrollParaBaixo() {

    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(value) {

    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}


// ============================================
// VOLTAR
// ============================================

backBtn.addEventListener('click', () => {
    window.location.href = 'conversas.html';
});