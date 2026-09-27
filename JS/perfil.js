const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';
const POSTS_BUCKET = 'publications';

const usernameText = document.getElementById('usernameText');
const bioCard = document.getElementById('bioCard');
const avatarInput = document.getElementById('avatarInput');
const avatarImg = document.getElementById('avatarImg');
const avatarDefaultIcon = document.getElementById('avatarDefaultIcon');
const postsGrid = document.getElementById('postsGrid');
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

            postsGrid.innerHTML = '';

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
                nome,
                especie,
                raca,
                idade,
                descricao,
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

function adicionarPublicacaoPet(
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


    if (
        pet.media_type === 'video'
    ) {

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
            `Publicação de ${pet.nome}`;


        tile.appendChild(
            img
        );

    }


    postsGrid.appendChild(
        tile
    );
}


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