/* DCS HUB 0.6: sessões de apresentação — NÃO É AUTENTICAÇÃO SEGURA.
   Os dados e credenciais abaixo são públicos no JavaScript. Não usar com informações reais.
   Em produção, Supabase Auth valida a senha e RLS verifica cada permissão. */
(function(){
'use strict';
const accounts=Object.freeze([
 {email:'admin@demo.dcs-hub.invalid',name:'Marina Souza',role:'Administrador',avatar:'MS'},
 {email:'gestor@demo.dcs-hub.invalid',name:'Rafael Teixeira',role:'Gestor',avatar:'RT'},
 {email:'dcs@demo.dcs-hub.invalid',name:'Camila Andrade',role:'Servidor DCS',avatar:'CA'},
 {email:'cerimonial@demo.dcs-hub.invalid',name:'Bruno Lima',role:'Servidor Cerimonial',avatar:'BL'},
 {email:'leitor@demo.dcs-hub.invalid',name:'Júlia Martins',role:'Leitor',avatar:'JM'}
]);
const password='DCSdemo2026!';
const store='dcs-hub-preview-session-v1';
const sessionMillis=8*60*60*1000;
const $=s=>document.querySelector(s);
const lookup=x=>accounts.find(a=>a.email===String(x||'').trim().toLowerCase());
const byRole=x=>accounts.find(a=>a.role===x);
function bridge(){return window.DCS_BRIDGE;}
function showError(message){
 const msg=$('#auth-error');
 if(msg){msg.hidden=false;msg.textContent=message;}
 const pass=$('#lf input[type=password], #lf input[data-auth-password]');
 if(pass){pass.setAttribute('aria-invalid','true');pass.focus();}
}
function clearError(){
 const msg=$('#auth-error');if(msg){msg.hidden=true;msg.textContent='';}
 const pass=$('#auth-pass');if(pass)pass.removeAttribute('aria-invalid');
}
function markSidebarRole(){
 const admin=bridge()?.S.role==='Administrador';
 let btn=$('#demo-reset-button');
 if(!btn&&admin){
  btn=document.createElement('button');
  btn.id='demo-reset-button';
  btn.className='nv';
  btn.title='Limpar somente os dados fictícios do navegador e encerrar a sessão';
  btn.type='button';
  btn.innerHTML='<span aria-hidden="true" style="font-size:19px;min-width:18px">↻</span><span class="tx">Restaurar demonstração</span>';
  const nav=$('#nav');if(nav)nav.appendChild(btn);
 }
 if(btn)btn.hidden=!admin;
}
function enter(account,restored=false){
 const ui=bridge();
 if(!ui||!account)return false;
 ui.S.role=account.role;
 ui.S.in=1;
 if(!restored)ui.S.first=1;
 const name=$('.me b');if(name)name.textContent=account.name+' · DEMO';
 const avatar=$('#av');if(avatar)avatar.textContent=account.avatar;
 const role=$('#ur');if(role)role.textContent=account.role;
 const profile=$('#pf');if(profile)profile.textContent=account.role;
 const login=$('#login');if(login)login.hidden=true;
 const app=$('#app');if(app)app.hidden=false;
 const sidebar=$('.sb .pl');if(sidebar)sidebar.innerHTML='<span class="tx">AMBIENTE DE TESTE · <b id="pf">'+account.role+'</b><small style="display:block">Nenhum dado institucional real.</small></span>';
 $('#lf input[type=password]').value='';
 clearError();
 markSidebarRole();
 window.DCS_DEMO_NOTIFY?.switchAccount(account.email);
 ui.bell();
 ui.route();
 return true;
}
function login(){
 if(window.DCS_BACKEND?.enabled)return false;
 const form=$('#lf');if(!form||!form.reportValidity())return false;
 const email=$('#lf input[type=email]').value.trim().toLowerCase();
 const pass=$('#lf input[type=password]').value;
 const account=lookup(email);
 if(!account||pass!==password){
  showError('E-mail ou senha de demonstração incorretos. Confira os dados de teste abaixo.');
  return false;
 }
 try{sessionStorage.setItem(store,JSON.stringify({email:account.email,until:Date.now()+sessionMillis}));}catch(_){}
 enter(account);
 return true;
}
function logout(){
 try{sessionStorage.removeItem(store);}catch(_){}
 const ui=bridge();
 if(ui){ui.S.in=0;ui.S.first=1;ui.S.role='';ui.S.ev=null;}
 if(window.DCS_KNOWLEDGE?.reset)window.DCS_KNOWLEDGE.reset();
 window.DCS_DEMO_NOTIFY?.logout();
 const app=$('#app');if(app)app.hidden=true;
 const login=$('#login');if(login)login.hidden=false;
 const pass=$('#lf input[type=password]');if(pass)pass.value='';
 clearError();
 const select=$('#rl');if(select){select.value='Administrador';fillAccount();}
 const menu=$('#demo-reset-button');if(menu)menu.hidden=true;
 try{window.location.hash='dashboard';}catch(_){}
}
function reset(){
 if(window.DCS_BACKEND?.enabled)return false;
 if(bridge()?.S?.role!=='Administrador'){
  bridge()?.toast('A limpeza da prévia exige o perfil demonstrativo Administrador');
  return false;
 }
 const proceed=window.confirm('Restaurar a demonstração?\n\nTodas as atividades e alterações fictícias feitas NESTE navegador serão descartadas. Não há exclusão em bancos externos. Esta ação não apaga dados reais.');
 if(!proceed)return false;
 try{
  sessionStorage.removeItem(store);
  window.DCS_DEMO_NOTIFY?.reset();
  window.DCS_MEETINGS?.reset();
  localStorage.removeItem('dcs-hub-preview-data-v1');
 }catch(_){}
 window.location.reload();
 return true;
}
function fillAccount(){
 const select=$('#rl'),email=$('#lf input[type=email]');
 if(!select||!email)return;
 const target=byRole(select.value);
 if(target){email.value=target.email;clearError();}
}
function restore(){
 if(window.DCS_BACKEND?.enabled)return false;
 let value;
 try{value=JSON.parse(sessionStorage.getItem(store)||'null');}catch(_){value=null;}
 const account=value&&Number(value.until)>Date.now()?lookup(value.email):null;
 if(!account){try{sessionStorage.removeItem(store);}catch(_){}return false;}
 return enter(account,true);
}
function setup(){
 // Supabase habilitado no bundle Vite: não oferecer contas fictícias.
 const isRealBuild=Boolean(window.DCS_REAL_BUILD_CONFIG);
 if(isRealBuild||window.DCS_BACKEND?.enabled){
  document.documentElement.dataset.authMode='real';
  return;
 }
 document.documentElement.dataset.authMode='preview';
 const select=$('#rl');
 if(select){
  select.value='Administrador';
  select.addEventListener('change',fillAccount);
 }
 fillAccount();
 const passwordInput=$('#auth-pass');
 const toggle=$('#auth-toggle');
 if(toggle&&passwordInput){
  toggle.addEventListener('click',()=>{
   const revealed=passwordInput.type==='text';
   passwordInput.type=revealed?'password':'text';
   toggle.textContent=revealed?'Mostrar':'Ocultar';
   toggle.setAttribute('aria-label',revealed?'Mostrar senha':'Ocultar senha');
  });
 }
 $('#lf input[type=email]')?.addEventListener('input',clearError);
 passwordInput?.addEventListener('input',clearError);
 document.addEventListener('click',e=>{
  if(e.target.closest('#demo-reset-button'))reset();
 });
 restore();
}
window.DCS_DEMO_AUTH={login,logout,reset,restore,currentEmail:()=>accounts.find(a=>a.role===bridge()?.S?.role)?.email||null,accounts:accounts.map(x=>({email:x.email,role:x.role})),version:'0.7'};
setup();
})();
