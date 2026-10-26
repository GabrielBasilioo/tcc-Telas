const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';
const POSTS_BUCKET = 'publications';

const usernameText = document.getElementById('usernameText');
const bioCard = document.getElementById('bioCard');
const avatarInput = document.getElementById('avatarInput');
const avatarImg = document.getElementById('avatarImg');
const avatarDefaultIcon = document.getElementById('avatarDefaultIcon');
const postsGrid = document.getElementById('postsGrid');
const deletePostModal = document.getElementById('deletePostModal');
const cancelDeletePost = document.getElementById('cancelDeletePost');
const confirmDeletePost = document.getElementById('confirmDeletePost');

let petPendenteParaExcluir = null;
let publicacaoPendenteParaExcluir = null;

const addPostTile =
    document.getElementById('addPostTile');

const postInput =
    document.getElementById('postInput');
const editOverlay = document.getElementById('editOverlay');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeEdit = document.getElementById('closeEdit');
const editUsernameInput = document.getElementById('editUsernameInput');
const editBioInput = document.getElementById('editBioInput');
const editStatus = document.getElementById('editStatus');
const saveEditBtn = document.getElementById('saveEditBtn');
// -- Campos novos da tela "Editar perfil" (ver seção "EDITAR PERFIL" mais abaixo) --
const editEmailInput = document.getElementById('editEmailInput');
const editPhoneInput = document.getElementById('editPhoneInput');
const editBirthInput = document.getElementById('editBirthInput');
const hoje = new Date().toISOString().split('T')[0];
editBirthInput.max = hoje;
const editHandleText = document.getElementById('editHandleText');
const editAvatarImg = document.getElementById('editAvatarImg');
const editAvatarDefaultIcon = document.getElementById('editAvatarDefaultIcon');
const editPasswordInput =
    document.getElementById('editPasswordInput');

const editPasswordConfirmInput =
    document.getElementById('editPasswordConfirmInput');

let currentBio = '';
let supabaseClient = null;
let currentUserId = null;
let currentProfile = null;
let currentEmail = '';

let sessionUserId = null;
let visualizandoOutroPerfil = false;

const perfilUrlParams =
    new URLSearchParams(window.location.search);

const perfilVisitadoId =
    perfilUrlParams.get('id');

try{
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  carregarPerfil();
}catch(error){
  console.error('Não foi possível conectar ao Supabase:', error);
}

// ---------- PERFIL ----------

async function carregarPerfil(){
  if(!supabaseClient) return;

  const { data:sessionData, error:sessionError } = await supabaseClient.auth.getSession();
  if(sessionError){ console.error('Erro ao verificar sessão:', sessionError.message); return; }
  if(!sessionData.session){ window.location.href = 'login.html'; return; }

  sessionUserId =
    sessionData.session.user.id;

currentUserId =
    perfilVisitadoId ||
    sessionUserId;

visualizandoOutroPerfil =
    currentUserId !== sessionUserId;

currentEmail =
    sessionData.session.user.email || '';
  currentEmail = sessionData.session.user.email || '';



  const editProfileBtn =
  document.getElementById('editProfileBtn');

const followProfileBtn =
  document.getElementById('followProfileBtn');

if (visualizandoOutroPerfil) {

  if (editProfileBtn) {
      editProfileBtn.style.display = 'none';
  }

  if (followProfileBtn) {
      followProfileBtn.style.display = 'block';
  }

} else {

  if (editProfileBtn) {
      editProfileBtn.style.display = 'block';
  }

  if (followProfileBtn) {
      followProfileBtn.style.display = 'none';
  }
}



  // ⚠️ IMPORTANTE: além de "username, avatar_url, bio" (que já existiam),
  // esta busca tenta trazer também "phone, birth_date, state, city" —
  // colunas NOVAS usadas pela tela de edição. Se elas ainda não existirem
  // na tabela "profiles", o Supabase erro nessa 1ª tentativa; por isso,
  // logo abaixo, há um "plano B" que busca só as colunas antigas — assim
  // nome/foto/bio continuam aparecendo normalmente mesmo sem rodar o SQL:
  //   alter table profiles add column phone text;
  //   alter table profiles add column birth_date date;
  //   alter table profiles add column state text;
  //   alter table profiles add column city text;
  let profile, error;
  ({ data:profile, error } = await supabaseClient
    .from('profiles')
    .select('username, avatar_url, bio, phone, birth_date')
    .eq('id', currentUserId)
    .single());

  if(error){
    console.warn('Colunas novas (phone/birth_date/state/city) indisponíveis ainda, buscando só o básico:', error.message);
    ({ data:profile, error } = await supabaseClient
      .from('profiles')
      .select('username, avatar_url, bio')
      .eq('id', currentUserId)
      .single());
  }

  if(error){ console.error('Erro ao carregar perfil:', error.message); return; }

  currentProfile = profile;
  usernameText.textContent = '@' + (profile.username || 'usuário');

  if(profile.avatar_url){
    avatarImg.src = profile.avatar_url + '?t=' + Date.now();
    avatarImg.style.display = 'block';
    avatarDefaultIcon.style.display = 'none';
    // mantém a foto sincronizada com o avatar mostrado dentro da tela de edição
    editAvatarImg.src = avatarImg.src;
    editAvatarImg.style.display = 'block';
    editAvatarDefaultIcon.style.display = 'none';
  }

  currentBio = profile.bio || '';
  mostrarBio(currentBio);

  carregarPublicacoes();


  if (visualizandoOutroPerfil) {
    await verificarSeguindo();
}

await carregarContadoresSeguidores();
  
}

function mostrarBio(bio){
  bioCard.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'bio-line';
  if(bio && bio.trim() !== ''){
    p.textContent = bio;
  }else{
    p.classList.add('bio-empty');
    p.textContent = 'Você ainda não escreveu uma bio. Toque em "Editar perfil" para adicionar uma.';
  }
  bioCard.appendChild(p);
}

// ---------- PUBLICAÇÕES / CURTIDAS ----------

const tabs = document.querySelectorAll('.tabs .tab');

let abaAtual = 'publicacoes';


tabs.forEach((tab, index) => {

    tab.addEventListener('click', async () => {

        tabs.forEach(item => {
            item.classList.remove('active');
        });

        tab.classList.add('active');


        if (index === 0) {

            abaAtual = 'publicacoes';

            await carregarPublicacoes();

        }

        else if (index === 1) {
            abaAtual = 'salvos';
        
            await carregarSalvos();
        }

        else if (index === 2) {

            abaAtual = 'curtidas';

            await carregarCurtidas();

        }

    });

});


/* =========================================================
   PUBLICAÇÕES DO USUÁRIO
========================================================= */

async function carregarPublicacoes() {

    if (!supabaseClient || !currentUserId) {
        return;
    }


    const { data, error } =
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
    vacinado,
    media_url,
    media_type
            `)
            .eq(
                'user_id',
                currentUserId
            )
            .order(
                'id',
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            'Erro ao carregar publicações:',
            error.message
        );

        return;
    }


    postsGrid.innerHTML = '';

    
const statPublicacoes = document.getElementById('statPublicacoes');

if (statPublicacoes) {
    statPublicacoes.textContent = data ? data.length : 0;
}


    if (!data || data.length === 0) {
        return;
    }

    


    data.forEach(
        pet => {

            adicionarPublicacaoPet(
                pet
            );

        }
    );
}


/* =========================================================
   PUBLICAÇÃO DO PET
========================================================= */


function adicionarPublicacaoPet(pet) {
    const tile = document.createElement('div');

    tile.className = 'post-tile';
    tile.dataset.petId = pet.id;
    tile.style.cursor = 'pointer';

    // Abrir a publicação continua funcionando normalmente.
    tile.addEventListener('click', () => {
        window.location.href =
            `feed.html?pet=${encodeURIComponent(pet.id)}`;
    });

    // Preserva a exibição de imagens e vídeos.
    if (
        pet.media_type === 'video' ||
        /\.(mp4|webm|mov)(\?.*)?$/i.test(pet.media_url || '')
    ) {
        const video = document.createElement('video');

        video.src = pet.media_url;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;

        video.addEventListener('mouseenter', () => {
            video.play().catch(() => {});
        });

        video.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
        });

        tile.appendChild(video);
    } else {
        const img = document.createElement('img');

        img.src = pet.media_url || '';
        img.alt = `Publicação de ${pet.nome || 'pet'}`;

        tile.appendChild(img);
    }

    
    // Botão de edição do pet: aparece apenas no perfil do tutor.
    if (
        !visualizandoOutroPerfil &&
        sessionUserId &&
        currentUserId === sessionUserId
    ) {
        const editPetBtn = document.createElement('button');

        editPetBtn.type = 'button';
        editPetBtn.className = 'post-edit-pet-btn';
        editPetBtn.setAttribute('aria-label', 'Editar informações do pet');
        editPetBtn.title = 'Editar pet';

        editPetBtn.innerHTML = `
            <svg viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06
                         a2 2 0 1 1-2.83 2.83l-.06-.06
                         a1.7 1.7 0 0 0-1.87-.34
                         1.7 1.7 0 0 0-1 1.55V21
                         a2 2 0 0 1-4 0v-.09
                         A1.7 1.7 0 0 0 9 19.4
                         a1.7 1.7 0 0 0-1.87.34l-.06.06
                         a2 2 0 1 1-2.83-2.83l.06-.06
                         A1.7 1.7 0 0 0 4.6 15
                         1.7 1.7 0 0 0 3.05 14H3
                         a2 2 0 0 1 0-4h.09
                         A1.7 1.7 0 0 0 4.6 9
                         a1.7 1.7 0 0 0-.34-1.87l-.06-.06
                         a2 2 0 1 1 2.83-2.83l.06.06
                         A1.7 1.7 0 0 0 9 4.6
                         a1.7 1.7 0 0 0 1-1.55V3
                         a2 2 0 0 1 4 0v.09
                         a1.7 1.7 0 0 0 1 1.55
                         1.7 1.7 0 0 0 1.87-.34l.06-.06
                         a2 2 0 1 1 2.83 2.83l-.06.06
                         A1.7 1.7 0 0 0 19.4 9
                         a1.7 1.7 0 0 0 1.55 1H21
                         a2 2 0 0 1 0 4h-.09
                         A1.7 1.7 0 0 0 19.4 15Z"/>
            </svg>
        `;

        editPetBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            abrirEdicaoPet(pet);
        });

        tile.appendChild(editPetBtn);
    }



    // O botão só aparece nas publicações do próprio usuário.
    if (
        !visualizandoOutroPerfil &&
        sessionUserId &&
        currentUserId === sessionUserId
    ) {
        
    // Botão de engrenagem para editar o pet.
    const editPetBtn = document.createElement('button');

    editPetBtn.type = 'button';
    editPetBtn.className = 'post-edit-pet-btn';
    editPetBtn.title = 'Editar informações do pet';
    editPetBtn.setAttribute('aria-label', 'Editar informações do pet');

    editPetBtn.innerHTML = `
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z"></path>
        </svg>
    `;

    editPetBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        abrirEdicaoPet(pet);
    });

    tile.appendChild(editPetBtn);




        const removeBtn = document.createElement('button');

        removeBtn.type = 'button';
        removeBtn.className = 'post-remove-btn';
        removeBtn.textContent = '−';
        removeBtn.setAttribute('aria-label', 'Excluir publicação');

        // Não deixar o clique no botão abrir o feed.
        removeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            abrirConfirmacaoExclusao(pet, tile);
        });

        tile.appendChild(removeBtn);
    }

    postsGrid.appendChild(tile);
}


function abrirConfirmacaoExclusao(pet, tile) {
    // Impede exclusão se o perfil não for do usuário autenticado.
    if (
        !sessionUserId ||
        visualizandoOutroPerfil ||
        currentUserId !== sessionUserId
    ) {
        alert('Você só pode excluir suas próprias publicações.');
        return;
    }

    petPendenteParaExcluir = pet;
    publicacaoPendenteParaExcluir = tile;

    deletePostModal.classList.add('open');
    deletePostModal.setAttribute('aria-hidden', 'false');

    cancelDeletePost.disabled = false;
    confirmDeletePost.disabled = false;
    confirmDeletePost.textContent = 'Sim, excluir';

    cancelDeletePost.focus();
}

function fecharConfirmacaoExclusao() {
    deletePostModal.classList.remove('open');
    deletePostModal.setAttribute('aria-hidden', 'true');

    petPendenteParaExcluir = null;
    publicacaoPendenteParaExcluir = null;

    confirmDeletePost.disabled = false;
    cancelDeletePost.disabled = false;
    confirmDeletePost.textContent = 'Sim, excluir';
}

// Clicar em "Não" apenas fecha a janela.
cancelDeletePost.addEventListener('click', () => {
    fecharConfirmacaoExclusao();
});

// Clicar no fundo escuro também cancela.
deletePostModal.addEventListener('click', (event) => {
    if (event.target === deletePostModal) {
        fecharConfirmacaoExclusao();
    }
});

// Confirmar exclusão.
confirmDeletePost.addEventListener('click', async () => {
    const pet = petPendenteParaExcluir;
    const tile = publicacaoPendenteParaExcluir;

    if (!pet || !tile) {
        fecharConfirmacaoExclusao();
        return;
    }

    // Revalida a propriedade antes de enviar a exclusão.
    if (
        !supabaseClient ||
        !sessionUserId ||
        visualizandoOutroPerfil ||
        currentUserId !== sessionUserId
    ) {
        alert('Não foi possível confirmar a propriedade da publicação.');
        fecharConfirmacaoExclusao();
        return;
    }

    confirmDeletePost.disabled = true;
    cancelDeletePost.disabled = true;
    confirmDeletePost.textContent = 'Excluindo...';

    try {
        const { data, error } = await supabaseClient
            .from('pets')
            .delete()
            .eq('id', pet.id)
            .eq('user_id', sessionUserId)
            .select('id');

        if (error) {
            throw error;
        }

        // O Supabase pode não retornar erro quando nenhuma linha
        // é excluída por causa das políticas de acesso (RLS).
        if (!data || data.length === 0) {
            throw new Error(
                'Nenhum registro foi excluído. Verifique as permissões do Supabase.'
            );
        }

        // Só remove visualmente depois de confirmar a exclusão no banco.
        tile.remove();

        const statPublicacoes = document.getElementById('statPublicacoes');

if (statPublicacoes) {
    const quantidadeAtual = Number(statPublicacoes.textContent);
    statPublicacoes.textContent = Math.max(0, quantidadeAtual - 1);
}


        fecharConfirmacaoExclusao();

        alert('Publicação excluída com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir publicação:', error);

        alert(
            'Não foi possível excluir a publicação. ' +
            (error.message || 'Tente novamente.')
        );

        confirmDeletePost.disabled = false;
        cancelDeletePost.disabled = false;
        confirmDeletePost.textContent = 'Sim, excluir';
    }
});

// Fechar com a tecla Escape, sem apagar nada.
document.addEventListener('keydown', (event) => {
    if (
        event.key === 'Escape' &&
        deletePostModal.classList.contains('open') &&
        !confirmDeletePost.disabled
    ) {
        fecharConfirmacaoExclusao();
    }
});



/* =========================================================
   CARREGAR CURTIDAS
========================================================= */

async function carregarCurtidas() {

  if (
      !supabaseClient ||
      !currentUserId
  ) {
      return;
  }

  postsGrid.innerHTML = '';

  const { data: likes, error: likesError } =
      await supabaseClient
          .from('likes')
          .select(`
              pet_id,
              created_at,
              pets (
                  id,
                  nome,
                  media_url,
                  media_type
              )
          `)
          .eq(
              'user_id',
              currentUserId
          )
          .order(
              'created_at',
              {
                  ascending: false
              }
          );

  if (likesError) {

      console.error(
          'Erro ao carregar curtidas:',
          likesError.message
      );

      return;
  }

  if (
      !likes ||
      likes.length === 0
  ) {
      return;
  }

  likes.forEach(
      like => {

          if (!like.pets) {
              return;
          }

          adicionarPublicacaoCurtida(
              like.pets
          );

      }
  );
}


async function carregarSalvos() {
    if (!supabaseClient || !sessionUserId) {
        return;
    }

    postsGrid.innerHTML = '';

    // Os favoritos são privados: só o dono pode ver.
    if (visualizandoOutroPerfil) {
        postsGrid.textContent =
            'Os animais salvos são privados.';
        return;
    }

    const { data: salvos, error } = await supabaseClient
        .from('saved_pets')
        .select(`
            pet_id,
            created_at,
            pets (
                id,
                nome,
                media_url,
                media_type
            )
        `)
        .eq('user_id', sessionUserId)
        .order('created_at', {
            ascending: false
        });

    if (error) {
        console.error('Erro ao carregar animais salvos:', error);
        postsGrid.textContent =
            'Não foi possível carregar os animais salvos.';
        return;
    }

    if (!salvos || salvos.length === 0) {
        postsGrid.textContent =
            'Você ainda não salvou nenhum animal.';
        return;
    }

    salvos.forEach(item => {
        if (item.pets) {
            adicionarPublicacaoCurtida(item.pets);
        }
    });
}







/* =========================================================
   MOSTRAR PUBLICAÇÃO CURTIDA
========================================================= */

function adicionarPublicacaoCurtida(
  pet
) {

  const tile =
      document.createElement('div');

  tile.className =
      'post-tile';

  tile.dataset.petId =
      pet.id;

  tile.style.cursor =
      'pointer';

  tile.addEventListener(
      'click',
      () => {

          window.location.href =
              `feed.html?pet=${encodeURIComponent(
                  pet.id
              )}`;

      }
  );

  if (!pet.media_url) {
      return;
  }

  const ehVideo =
      pet.media_type === 'video' ||
      /\.(mp4|webm|mov)(\?.*)?$/i.test(
          pet.media_url
      );

  if (ehVideo) {

      const video =
          document.createElement('video');

      video.src =
          pet.media_url;

      video.muted =
          true;

      video.playsInline =
          true;

      video.loop =
          true;

      video.addEventListener(
          'mouseenter',
          () => {
              video.play();
          }
      );

      video.addEventListener(
          'mouseleave',
          () => {

              video.pause();

              video.currentTime =
                  0;

          }
      );

      tile.appendChild(
          video
      );

  } else {

      const img =
          document.createElement('img');

      img.src =
          pet.media_url;

      img.alt =
          pet.nome ||
          'Publicação curtida';

      tile.appendChild(
          img
      );
  }

  postsGrid.appendChild(
      tile
  );
}

// ---------- EDITAR PERFIL ----------

// Abre a tela cheia de edição e preenche cada campo com o que já está
// carregado em "currentProfile" / "currentEmail" (buscados em carregarPerfil).
editProfileBtn.addEventListener('click', () => {
  editUsernameInput.value = usernameText.textContent.replace(/^@/, '');
  editHandleText.textContent = usernameText.textContent;
  editBioInput.value = currentBio;
  editEmailInput.value = currentEmail;
  editPhoneInput.value = currentProfile.phone || '';
  editBirthInput.value = currentProfile.birth_date || '';
  editStatus.textContent = '';
  editStatus.className = 'edit-status';
  editOverlay.classList.add('open');
});

// Botão de voltar (seta) no cabeçalho laranja fecha a tela de edição
closeEdit.addEventListener('click', () => editOverlay.classList.remove('open'));

saveEditBtn.addEventListener('click', async () => {
  const novoUsername = editUsernameInput.value.trim();
  const novaBio = editBioInput.value.trim();
  const novoEmail = editEmailInput.value.trim();
  const novoTelefone = editPhoneInput.value.trim();
  const novaDataNascimento = editBirthInput.value || null; // string 'YYYY-MM-DD' ou null
  if (novaDataNascimento) {
  const hoje = new Date();
  const dataNascimento = new Date(novaDataNascimento + 'T00:00:00');

  if (dataNascimento > hoje) {
    editStatus.textContent = 'A data de nascimento não pode ser uma data futura.';
    editStatus.className = 'edit-status error';
    return;
  }
}
  const novaSenha = editPasswordInput.value;
  const confirmarSenha = editPasswordConfirmInput.value;



  if (novaSenha || confirmarSenha) {

    if (novaSenha.length < 6) {
        editStatus.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        return;
    }

    if (novaSenha !== confirmarSenha) {
        editStatus.textContent = 'As senhas não coincidem.';
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({
        password: novaSenha
    });

    if (error) {
        editStatus.textContent = 'Erro ao alterar senha: ' + error.message;
        return;
    }
}


  if(!novoUsername){
    editStatus.textContent = 'O nome não pode ficar vazio.';
    editStatus.className = 'edit-status error';
    return;
  }
  if(!currentUserId){
    editStatus.textContent = 'Usuário não identificado.';
    editStatus.className = 'edit-status error';
    return;
  }

  saveEditBtn.disabled = true;
  editStatus.textContent = 'Salvando...';
  editStatus.className = 'edit-status';

  // 1) Atualiza a tabela "profiles" com todos os campos da tela.
  //    (as colunas phone/birth_date/state/city precisam existir — ver
  //    o comentário em carregarPerfil() com o SQL para criá-las)
  const { error } = await supabaseClient
    .from('profiles')
    .update({
        username: novoUsername,
        bio: novaBio,
        phone: novoTelefone,
        birth_date: novaDataNascimento,
    })
    .eq('id', currentUserId);

    if (error) {
    if (error.code === '23505') {
        editStatus.textContent =
            'Este telefone já está cadastrado em outra conta.';
    } else {
        editStatus.textContent =
            'Erro ao salvar: ' + error.message;
    }

    editStatus.className = 'edit-status error';
    return;
}



  let avisoColunas = '';
  if(error){
    // Plano B: colunas novas ainda não existem no banco — salva pelo
    // menos username e bio (como já funcionava antes), sem perder tudo.
    console.warn('Não deu pra salvar phone/birth_date/state/city ainda, salvando só username/bio:', error.message);
    ({ error } = await supabaseClient
      .from('profiles')
      .update({ username: novoUsername, bio: novaBio })
      .eq('id', currentUserId));
    avisoColunas = ' (telefone/nascimento/endereço não foram salvos: crie as colunas no banco, veja o comentário no código)';
  }

  if(error){
    saveEditBtn.disabled = false;
    console.error('Erro ao atualizar perfil:', error.message);
    editStatus.textContent = error.message;
    editStatus.className = 'edit-status error';
    return;
  }


  
  // 2) Se o email foi alterado, atualiza no Supabase Auth (login).
  //    Por segurança, o Supabase envia um link de confirmação para o
  //    e-mail novo antes de efetivar a troca — por isso avisamos o usuário.
  let avisoEmail = '';
  if(novoEmail && novoEmail !== currentEmail){
    const { error:emailError } = await supabaseClient.auth.updateUser({ email: novoEmail });
    if(emailError){
      console.error('Erro ao atualizar email:', emailError.message);
      avisoEmail = ' (email não alterado: ' + emailError.message + ')';
    } else {
      avisoEmail = ' Confirme o novo email na caixa de entrada.';
    }
  }

  saveEditBtn.disabled = false;

  // Atualiza a tela principal do perfil com os novos valores
  usernameText.textContent = '@' + novoUsername;
  currentBio = novaBio;
  currentProfile = { ...currentProfile, phone:novoTelefone, birth_date:novaDataNascimento};
  mostrarBio(novaBio);

  editStatus.textContent = 'Perfil atualizado!' + avisoEmail + avisoColunas;
  editStatus.className = 'edit-status success';
  setTimeout(() => editOverlay.classList.remove('open'), 900);
});

// ---------- AVATAR ----------

avatarInput.addEventListener('change', async () => {
  const file = avatarInput.files[0];
  if(!file) return;
  if(!supabaseClient || !currentUserId){ alert('Usuário não identificado.'); return; }

  const previewUrl = URL.createObjectURL(file);
  avatarImg.src = previewUrl;
  avatarImg.style.display = 'block';
  avatarDefaultIcon.style.display = 'none';
  // o input de arquivo (#avatarInput) é o mesmo usado pelo botão de
  // câmera dentro da tela "Editar perfil", então atualizamos as duas prévias
  editAvatarImg.src = previewUrl;
  editAvatarImg.style.display = 'block';
  editAvatarDefaultIcon.style.display = 'none';

  const extensao = file.name.split('.').pop().toLowerCase();
  const caminhoArquivo = `${currentUserId}/avatar.${extensao}`;

  const { error:uploadError } = await supabaseClient.storage.from('avatars').upload(caminhoArquivo, file, { upsert:true, contentType:file.type });
  if(uploadError){ alert('Não foi possível enviar a foto: ' + uploadError.message); return; }

  const { data:urlData } = supabaseClient.storage.from('avatars').getPublicUrl(caminhoArquivo);
  const avatarUrl = urlData.publicUrl;

  const { error:updateError } = await supabaseClient.from('profiles').update({ avatar_url:avatarUrl }).eq('id', currentUserId);
  if(updateError){ alert('A foto foi enviada, mas não foi possível salvar no perfil.'); return; }

  avatarImg.src = avatarUrl + '?t=' + Date.now();
  editAvatarImg.src = avatarImg.src;
  avatarInput.value = '';
});

// ---------- NOVA PUBLICAÇÃO ----------

if (addPostTile && postInput) {

    addPostTile.addEventListener(
        'click',
        () => postInput.click()
    );

    postInput.addEventListener(
        'change',
        async () => {

            const file = postInput.files[0];

            if (!file) return;

            if (!supabaseClient || !currentUserId) {
                alert('Usuário não identificado.');
                return;
            }

            const extensao =
                file.name.split('.').pop().toLowerCase();

            const nomeArquivo =
                `${Date.now()}.${extensao}`;

            const caminhoArquivo =
                `${currentUserId}/${nomeArquivo}`;

            const tilePreview =
                adicionarPublicacao(
                    URL.createObjectURL(file),
                    caminhoArquivo
                );

            const { error: uploadError } =
                await supabaseClient
                    .storage
                    .from(POSTS_BUCKET)
                    .upload(
                        caminhoArquivo,
                        file,
                        {
                            contentType: file.type
                        }
                    );

            if (uploadError) {

                console.error(
                    'Erro ao enviar publicação:',
                    uploadError.message
                );

                alert(
                    'Não foi possível enviar a publicação: ' +
                    uploadError.message
                );

                tilePreview.remove();
                postInput.value = '';

                return;
            }

            const { data: urlData } =
                supabaseClient
                    .storage
                    .from(POSTS_BUCKET)
                    .getPublicUrl(caminhoArquivo);

            tilePreview.querySelector('img').src =
                urlData.publicUrl +
                '?t=' +
                Date.now();

            postInput.value = '';
        }
    );
}


async function verificarSeguindo() {

    if (!visualizandoOutroPerfil) {
        return;
    }

    const followProfileBtn =
        document.getElementById(
            'followProfileBtn'
        );

    if (!followProfileBtn) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from('followers')
        .select('id')
        .eq(
            'follower_id',
            sessionUserId
        )
        .eq(
            'following_id',
            currentUserId
        )
        .maybeSingle();

    if (error) {

        console.error(
            'Erro ao verificar seguimento:',
            error
        );

        return;
    }

    if (data) {

        followProfileBtn.textContent =
            'Seguindo';

        followProfileBtn.classList.add(
            'following'
        );

    } else {

        followProfileBtn.textContent =
            'Seguir';

        followProfileBtn.classList.remove(
            'following'
        );
    }
}

async function alternarSeguir() {

    console.log('BOTÃO SEGUIR CLICADO');

    if (!visualizandoOutroPerfil) {
        console.log('Não está visualizando outro perfil');
        return;
    }


    if (!visualizandoOutroPerfil) {
        return;
    }

    const followProfileBtn =
        document.getElementById(
            'followProfileBtn'
        );

    if (!followProfileBtn) {
        return;
    }

    followProfileBtn.disabled = true;

    const {
        data: seguindo,
        error: buscaError
    } = await supabaseClient
        .from('followers')
        .select('id')
        .eq(
            'follower_id',
            sessionUserId
        )
        .eq(
            'following_id',
            currentUserId
        )
        .maybeSingle();

    if (buscaError) {

        console.error(
            'Erro ao verificar seguimento:',
            buscaError
        );

        followProfileBtn.disabled = false;

        return;
    }

    // DEIXAR DE SEGUIR
    if (seguindo) {

        const {
            error
        } = await supabaseClient
            .from('followers')
            .delete()
            .eq(
                'id',
                seguindo.id
            );

        if (error) {

            console.error(
                'Erro ao deixar de seguir:',
                error
            );

        } else {

            followProfileBtn.textContent =
                'Seguir';

            followProfileBtn.classList.remove(
                'following'
            );
        }

    }

    // SEGUIR
    else {

        const {
            error
        } = await supabaseClient
            .from('followers')
            .insert({
                follower_id:
                    sessionUserId,

                following_id:
                    currentUserId
            });

        if (error) {

            console.error(
                'Erro ao seguir usuário:',
                error
            );

        } else {

            followProfileBtn.textContent =
                'Seguindo';

            followProfileBtn.classList.add(
                'following'
            );
        }
    }

    followProfileBtn.disabled = false;

    await carregarContadoresSeguidores();
}
async function carregarContadoresSeguidores() {

    const statSeguindo =
        document.getElementById(
            'statSeguindo'
        );

    const statSeguidores =
        document.getElementById(
            'statSeguidores'
        );

    const {
        count: seguindo,
        error: seguindoError
    } = await supabaseClient
        .from('followers')
        .select('*', {
            count: 'exact',
            head: true
        })
        .eq(
            'follower_id',
            currentUserId
        );

    const {
        count: seguidores,
        error: seguidoresError
    } = await supabaseClient
        .from('followers')
        .select('*', {
            count: 'exact',
            head: true
        })
        .eq(
            'following_id',
            currentUserId
        );

    if (seguindoError) {
        console.error(
            'Erro ao carregar seguindo:',
            seguindoError
        );
    }

    if (seguidoresError) {
        console.error(
            'Erro ao carregar seguidores:',
            seguidoresError
        );
    }

    if (statSeguindo) {
        statSeguindo.textContent =
            seguindo || 0;
    }

    if (statSeguidores) {
        statSeguidores.textContent =
            seguidores || 0;
    }
}
const followProfileBtn =
    document.getElementById('followProfileBtn');

if (followProfileBtn) {
    followProfileBtn.onclick = async () => {
        await alternarSeguir();
    };
}


/* =========================================
   EDITAR INFORMAÇÕES DO PET
========================================= */

let petEmEdicao = null;

function inicializarModalEdicaoPet() {
    if (document.getElementById('editPetModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="edit-pet-modal" id="editPetModal"
             aria-hidden="true">
            <form class="edit-pet-card" id="editPetForm">
                <div class="edit-pet-header">
                    <h2>Editar pet</h2>
                    <button type="button" id="closeEditPet"
                            aria-label="Fechar">×</button>
                </div>

                <label for="editPetNome">Nome</label>
                <input id="editPetNome" name="nome"
                       type="text" required maxlength="100">

                <label for="editPetEspecie">Espécie</label>
                <select id="editPetEspecie" name="especie" required>
                    <option value="Cachorro">Cachorro</option>
                    <option value="Gato">Gato</option>
                    <option value="Outro">Outro</option>
                </select>

                <label for="editPetGenero">Gênero</label>
                <select id="editPetGenero" name="genero" required>
                    <option value="">Selecione o gênero</option>
                    <option value="Feminino">Fêmea</option>
                    <option value="Masculino">Macho</option>
                </select>



                <label for="editPetRaca">Raça</label>
                <input id="editPetRaca" name="raca" type="text"
                       maxlength="100">

                <label for="editPetIdade">Idade</label>
                <input id="editPetIdade" name="idade" type="text"
                       maxlength="50">

                <label for="editPetDescricao">Descrição</label>
                <textarea id="editPetDescricao" name="descricao"
                          rows="3" maxlength="2000"></textarea>

                <div class="edit-pet-checks">
                    <label>
                        <input type="checkbox" id="editPetMicrochipado">
                        Microchipado
                    </label>
                    <label>
                        <input type="checkbox" id="editPetCastrado">
                        Castrado
                    </label>
                    <label>
                        <input type="checkbox" id="editPetVacinado">
                        Vacinado
                    </label>
                </div>

                <p id="editPetStatus" role="status"></p>

                <button class="edit-pet-save" id="saveEditPet"
                        type="submit">
                    Salvar alterações
                </button>
            </form>
        </div>
    `);

    document.getElementById('closeEditPet')
        .addEventListener('click', fecharEdicaoPet);

    document.getElementById('editPetModal')
        .addEventListener('click', (event) => {
            if (event.target.id === 'editPetModal') {
                fecharEdicaoPet();
            }
        });

    document.getElementById('editPetForm')
        .addEventListener('submit', salvarEdicaoPet);
}

function valorBooleano(valor) {
    return valor === true ||
        valor === 1 ||
        valor === 'true' ||
        valor === 'sim';
}

function abrirEdicaoPet(pet) {
    if (
        !supabaseClient ||
        !sessionUserId ||
        visualizandoOutroPerfil ||
        currentUserId !== sessionUserId ||
        String(pet.user_id) !== String(sessionUserId)
    ) {
        alert('Você só pode editar seus próprios pets.');
        return;
    }

    inicializarModalEdicaoPet();
    petEmEdicao = pet;

    document.getElementById('editPetNome').value =
        pet.nome || '';

    document.getElementById('editPetEspecie').value =
        pet.especie || 'Cachorro';

    document.getElementById('editPetGenero').value =
        pet.genero || '';
    
    document.getElementById('editPetRaca').value =
        pet.raca || '';

    document.getElementById('editPetIdade').value =
        pet.idade ?? '';

    document.getElementById('editPetDescricao').value =
        pet.descricao || '';

    document.getElementById('editPetMicrochipado').checked =
        valorBooleano(pet.microchipado);

    document.getElementById('editPetCastrado').checked =
        valorBooleano(pet.castrado);

    document.getElementById('editPetVacinado').checked =
        valorBooleano(pet.vacinado);

    document.getElementById('editPetStatus').textContent = '';

    const modal = document.getElementById('editPetModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}

function fecharEdicaoPet() {
    const modal = document.getElementById('editPetModal');
    if (!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    petEmEdicao = null;
}

async function salvarEdicaoPet(event) {
    event.preventDefault();

    const status = document.getElementById('editPetStatus');
    const saveButton = document.getElementById('saveEditPet');

    // Confere novamente a sessão e a propriedade do registro.
    if (
        !supabaseClient ||
        !sessionUserId ||
        !petEmEdicao ||
        visualizandoOutroPerfil ||
        currentUserId !== sessionUserId ||
        String(petEmEdicao.user_id) !== String(sessionUserId)
    ) {
        status.textContent = 'Não foi possível validar o proprietário do pet.';
        return;
    }

    const dadosAtualizados = {
        nome: document.getElementById('editPetNome').value.trim(),
        especie: document.getElementById('editPetEspecie').value,
        genero: document.getElementById('editPetGenero').value,
        raca: document.getElementById('editPetRaca').value.trim(),
        idade: document.getElementById('editPetIdade').value.trim(),
        descricao: document.getElementById('editPetDescricao').value.trim(),
        microchipado: document.getElementById('editPetMicrochipado').checked,
        castrado: document.getElementById('editPetCastrado').checked,
        vacinado: document.getElementById('editPetVacinado').checked
    };

    if (!dadosAtualizados.nome) {
        status.textContent = 'Informe o nome do pet.';
        return;
    }

    saveButton.disabled = true;
    status.textContent = 'Salvando alterações...';

    try {
        const { data, error } = await supabaseClient
            .from('pets')
            .update(dadosAtualizados)
            .eq('id', petEmEdicao.id)
            .eq('user_id', sessionUserId)
            .select('id')
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                'Nenhum registro foi atualizado. Verifique as permissões do Supabase.'
            );
        }

        fecharEdicaoPet();

        if (abaAtual === 'publicacoes') {
            await carregarPublicacoes();
        }

        alert('Informações do pet atualizadas com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar pet:', error);
        status.textContent =
            'Não foi possível salvar: ' + (error.message || 'erro desconhecido.');
    } finally {
        saveButton.disabled = false;
    }
}

inicializarModalEdicaoPet();
