const THEME_KEY='pettok-theme';
function applyTheme(theme){document.documentElement.dataset.theme=theme;document.getElementById('lightBtn').classList.toggle('active',theme==='light');document.getElementById('darkBtn').classList.toggle('active',theme==='dark');document.getElementById('themeText').textContent=theme==='dark'?'Tema escuro ativado':'Tema claro ativado'}
function setTheme(theme){localStorage.setItem(THEME_KEY,theme);applyTheme(theme);toast(theme==='dark'?'Tema escuro ativado 🌙':'Tema claro ativado ☀️')}
applyTheme(localStorage.getItem(THEME_KEY)==='dark'?'dark':'light');
function go(page){location.href=page}
function toast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>el.classList.remove('show'),2200)}
function modal(title,text,extra=''){document.getElementById('modalTitle').textContent=title;document.getElementById('modalText').textContent=text;document.getElementById('modalExtra').textContent=extra;document.getElementById('modal').classList.add('open')}
function closeModal(){document.getElementById('modal').classList.remove('open')}
async function notifications(){if(!('Notification'in window)){toast('Seu navegador não suporta notificações.');return}if(Notification.permission==='granted'){toast('Notificações já estão ativadas.');return}const p=await Notification.requestPermission();toast(p==='granted'?'Notificações ativadas.':'Permissão não concedida.')}
function locationAccess(){if(!navigator.geolocation){toast('Localização não disponível.');return}document.getElementById('locationText').textContent='Solicitando localização...';navigator.geolocation.getCurrentPosition(()=>{document.getElementById('locationText').textContent='Localização permitida';toast('Localização atualizada.')},()=>{document.getElementById('locationText').textContent='Permissão não concedida';toast('Não foi possível acessar sua localização.')})}
async function logout(){try{if(window.supabase?.auth){await window.supabase.auth.signOut()}}catch(e){}localStorage.removeItem(THEME_KEY);go('index.html')}
