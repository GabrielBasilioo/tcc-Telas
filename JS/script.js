// ---- Elementos da tela (isso sempre funciona, não depende de internet) ----
    let mode = 'login'; // ou 'signup'

    const formTitle = document.getElementById('formTitle');
    const usernameField = document.getElementById('usernameField');
    const forgotWrap = document.getElementById('forgotWrap');
    const submitBtn = document.getElementById('submitBtn');
    const switchModeBtn = document.getElementById('switchModeBtn');
    const statusMsg = document.getElementById('statusMsg');
    const authForm = document.getElementById('authForm');

    function setMode(newMode){
      mode = newMode;
      statusMsg.textContent = '';
      if(mode === 'signup'){
        formTitle.textContent = 'Cadastro';
        usernameField.style.display = 'block';
        forgotWrap.style.visibility = 'hidden';
        submitBtn.textContent = 'Cadastrar';
        switchModeBtn.textContent = 'Já tem conta? Entrar';
      } else {
        formTitle.textContent = 'Login';
        usernameField.style.display = 'none';
        forgotWrap.style.visibility = 'visible';
        submitBtn.textContent = 'Login';
        switchModeBtn.textContent = 'Não tem conta? Cadastre-se';
      }
    }

    switchModeBtn.addEventListener('click', () => {
      setMode(mode === 'login' ? 'signup' : 'login');
    });

    // ---- Conexão com o Supabase ----
    // ⚠️ A chave abaixo é a "anon/publishable" — segura para expor no front-end,
    // desde que o RLS esteja ativo nas suas tabelas (já está).
    const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

    let supabaseClient = null;
    try{
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(err){
      statusMsg.textContent = 'Não foi possível conectar ao Supabase. Verifique sua internet e recarregue a página.';
      statusMsg.classList.add('error');
    }

    document.getElementById('forgotLink').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      if(!email){
        statusMsg.textContent = 'Digite seu email acima primeiro.';
        return;
      }
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      statusMsg.textContent = error ? error.message : 'Enviamos um link de recuperação para seu email.';
    });

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusMsg.classList.remove('error');

      if(!supabaseClient){
        statusMsg.textContent = 'Sem conexão com o Supabase. Recarregue a página com internet ativa.';
        statusMsg.classList.add('error');
        return;
      }

      statusMsg.textContent = mode === 'signup' ? 'Criando conta...' : 'Entrando...';
      submitBtn.disabled = true;

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if(mode === 'signup'){
        const username = document.getElementById('username').value.trim();

        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });

        if(error){
          statusMsg.textContent = error.message;
          statusMsg.classList.add('error');
        } else if(data.session){
          statusMsg.textContent = 'Conta criada! Você já está logado(a).';
        } else {
          statusMsg.textContent = 'Conta criada! Verifique seu email para confirmar.';
        }

      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if(error){
          statusMsg.textContent = error.message;
          statusMsg.classList.add('error');
        } else {
          statusMsg.textContent = 'Login realizado com sucesso!';
          window.location.href = 'home.html';
        }
      }

      submitBtn.disabled = false;
    });