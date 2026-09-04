const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';
const POSTS_BUCKET = 'publications';

const usernameText = document.getElementById('usernameText');
const bioCard = document.getElementById('bioCard');
const avatarInput = document.getElementById('avatarInput');
const avatarImg = document.getElementById('avatarImg');
const avatarDefaultIcon = document.getElementById('avatarDefaultIcon');
const postInput = document.getElementById('postInput');
const addPostTile = document.getElementById('addPostTile');
const postsGrid = document.getElementById('postsGrid');
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
const editStateInput = document.getElementById('editStateInput');
const editCityInput = document.getElementById('editCityInput');
const editHandleText = document.getElementById('editHandleText');
const editAvatarImg = document.getElementById('editAvatarImg');
const editAvatarDefaultIcon = document.getElementById('editAvatarDefaultIcon');

let supabaseClient = null;
let currentUserId = null;
let currentBio = '';
// Guarda a última versão do perfil carregado do banco (username, bio,
// phone, birth_date, state, city) + o email de login (auth.users), para
// preencher a tela de edição sem precisar buscar tudo de novo.
let currentProfile = {};
let currentEmail = '';

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

  currentUserId = sessionData.session.user.id;
  currentEmail = sessionData.session.user.email || '';

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
    .select('username, avatar_url, bio, phone, birth_date, state, city')
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

// ---------- PUBLICAÇÕES (múltiplas, listadas direto do Storage) ----------

async function carregarPublicacoes(){
  const { data, error } = await supabaseClient.storage.from(POSTS_BUCKET).list(currentUserId, {
    sortBy: { column: 'created_at', order: 'desc' }
  });
  if(error || !data) return;

  postsGrid.querySelectorAll('.post-tile:not(.add-tile)').forEach(tile => tile.remove());

  data.forEach(file => {
    const caminho = `${currentUserId}/${file.name}`;
    const { data:urlData } = supabaseClient.storage.from(POSTS_BUCKET).getPublicUrl(caminho);
    adicionarPublicacao(urlData.publicUrl + '?t=' + Date.now(), caminho);
  });
}

function adicionarPublicacao(url, caminhoArquivo){
  const tile = document.createElement('div');
  tile.className = 'post-tile';
  tile.dataset.path = caminhoArquivo;

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Publicação';
  tile.appendChild(img);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'post-remove-btn';
  removeBtn.textContent = '-';
  removeBtn.setAttribute('aria-label', 'Remover publicação');
  removeBtn.addEventListener('click', () => removerPublicacao(tile));
  tile.appendChild(removeBtn);

  postsGrid.insertBefore(tile, addPostTile);
  return tile;
}

async function removerPublicacao(tile){
  const caminhoArquivo = tile.dataset.path;
  if(!caminhoArquivo || !confirm('Remover esta publicação?')) return;

  const { error } = await supabaseClient.storage.from(POSTS_BUCKET).remove([caminhoArquivo]);
  if(error){
    console.error('Erro ao remover publicação:', error.message);
    alert('Não foi possível remover a publicação: ' + error.message);
    return;
  }
  tile.remove();
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
  editStateInput.value = currentProfile.state || '';
  editCityInput.value = currentProfile.city || '';
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
  const novoEstado = editStateInput.value.trim();
  const novaCidade = editCityInput.value.trim();

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
  let { error } = await supabaseClient
    .from('profiles')
    .update({
      username: novoUsername,
      bio: novaBio,
      phone: novoTelefone,
      birth_date: novaDataNascimento,
      state: novoEstado,
      city: novaCidade
    })
    .eq('id', currentUserId);

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
  currentProfile = { ...currentProfile, phone:novoTelefone, birth_date:novaDataNascimento, state:novoEstado, city:novaCidade };
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

addPostTile.addEventListener('click', () => postInput.click());

postInput.addEventListener('change', async () => {
  const file = postInput.files[0];
  if(!file) return;
  if(!supabaseClient || !currentUserId){ alert('Usuário não identificado.'); return; }

  const extensao = file.name.split('.').pop().toLowerCase();
  const nomeArquivo = `${Date.now()}.${extensao}`; // nome único: não sobrescreve publicações anteriores
  const caminhoArquivo = `${currentUserId}/${nomeArquivo}`;

  const tilePreview = adicionarPublicacao(URL.createObjectURL(file), caminhoArquivo);

  const { error:uploadError } = await supabaseClient.storage.from(POSTS_BUCKET).upload(caminhoArquivo, file, { contentType:file.type });

  if(uploadError){
    console.error('Erro ao enviar publicação:', uploadError.message);
    alert('Não foi possível enviar a publicação: ' + uploadError.message);
    tilePreview.remove();
    postInput.value = '';
    return;
  }

  const { data:urlData } = supabaseClient.storage.from(POSTS_BUCKET).getPublicUrl(caminhoArquivo);
  tilePreview.querySelector('img').src = urlData.publicUrl + '?t=' + Date.now();

  postInput.value = '';
});