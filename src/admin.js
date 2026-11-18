/* DCS HUB · Administração v0.4 | dados de demonstração não persistem */
(function(){
'use strict';
var state={search:'',filter:'all',department:'all',profiles:null,audit:[],loading:false,busy:false};
var roleNames={admin:'Administrador',manager:'Gestor',dcs:'Servidor DCS',ceremonial:'Servidor Cerimonial',reader:'Leitor'};
var roles=[
 ['admin','Administrador','Gerencia usuários e todas as operações'],
 ['manager','Gestor','Confirma eventos e acompanha toda a equipe'],
 ['dcs','Servidor DCS','Cria e executa atividades e tarefas'],
 ['ceremonial','Servidor Cerimonial','Cria e executa atividades e tarefas'],
 ['reader','Leitor','Somente consulta, sem alterações']
];
var demoSeed=[
 ['demo-adm','Marina Souza','marina.demo@exemplo.invalid','admin','DCS',true],
 ['demo-ges','Rafael Teixeira','rafael.demo@exemplo.invalid','manager','Cerimonial',true],
 ['demo-dcs','Camila Andrade','camila.demo@exemplo.invalid','dcs','DCS',true],
 ['demo-cer','Bruno Lima','bruno.demo@exemplo.invalid','ceremonial','Cerimonial',true],
 ['demo-cv','Júlia Martins','julia.demo@exemplo.invalid','dcs','DCS',true],
 ['demo-new','Fernanda Oliveira','fernanda.demo@exemplo.invalid','reader','DCS',false]
];
var demoAudit=[
 {actor_id:'demo-adm',target_name:'Bruno Lima',old_role:'reader',new_role:'ceremonial',old_active:false,new_active:true,created_at:new Date(Date.now()-86400000).toISOString()},
 {actor_id:'demo-adm',target_name:'Fernanda Oliveira',old_role:'reader',new_role:'reader',old_active:false,new_active:false,created_at:new Date(Date.now()-172800000).toISOString()}
];
function escape(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function backend(){return window.DCS_BACKEND;}
function real(){return !!(backend()&&backend().enabled);}
function canAdmin(){return window.DCS_BRIDGE&&window.DCS_BRIDGE.S.role==='Administrador';}
function currentId(){return real()?backend().currentUserId(): 'demo-adm';}
function toast(s){window.DCS_BRIDGE.toast(s);}
function fullName(p){return p.full_name||'Usuário';}
function shortName(p){return fullName(p).split(/\s+/).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase();}
function statusPill(p){return p.active?'<span class="admin-state"><i></i>Ativo</span>':'<span class="admin-state pending"><i></i>Pendente</span>';}
function formatDate(d){if(!d)return '—';return new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
function demoProfiles(){return demoSeed.map(function(x){return {id:x[0],full_name:x[1],email:x[2],role:x[3],department:x[4],active:x[5],created_at:new Date(Date.now()-86400000*3).toISOString()};});}
function clearModal(){document.getElementById('ov').innerHTML='';}
function modal(body){document.getElementById('ov').innerHTML='<div class="bk" data-close></div><div class="card md admin-edit-modal" role="dialog" aria-modal="true" aria-label="Administração de usuários">'+body+'</div>';var x=document.querySelector('#ov input,#ov button');if(x)x.focus();}
function option(val,text,selected){return '<option value="'+escape(val)+'"'+(val===selected?' selected':'')+'>'+escape(text)+'</option>';}
function disabledInfo(){document.getElementById('view').innerHTML='<section class="card st"><div class="mk">D</div><h1>Acesso administrativo</h1><p>A gestão de usuários é exclusiva do perfil Administrador. Essa permissão também é verificada no banco de dados.</p><button class="btn pri" data-go="dashboard">Voltar ao dashboard</button></section>';}
function setLoading(){document.getElementById('view').innerHTML='<section class="card p"><h2>Administração de usuários</h2><p class="mu">Carregando perfis e histórico…</p></section>';}
async function fetchData(){
 if(real()){
   var results=await Promise.all([backend().listAdminProfiles(),backend().listAdminAudit()]);
   state.profiles=results[0];state.audit=results[1];
 } else {
   if(!state.profiles)state.profiles=demoProfiles();
   if(!state.audit.length)state.audit=demoAudit.slice();
   window.DCS_TEAMS?.setDemoMembers(state.profiles);
 }
}
async function render(){
 if(!canAdmin()){disabledInfo();return;}
 if(state.loading)return;
 state.loading=true;setLoading();
 try{await fetchData();if(window.DCS_BRIDGE.S.route==='admin')paint();}
 catch(err){document.getElementById('view').innerHTML='<section class="card st"><h2>Administração indisponível</h2><p>'+escape(err.message)+'</p><button class="btn pri" data-admin-refresh>Tentar novamente</button></section>';}
 finally{state.loading=false;}
}
function summary(){
 var p=state.profiles||[];
 return [
  ['Servidores cadastrados',p.length],
  ['Contas ativas',p.filter(function(x){return x.active;}).length],
  ['Aguardando liberação',p.filter(function(x){return !x.active;}).length],
  ['Gestores e administradores',p.filter(function(x){return x.active&&(x.role==='admin'||x.role==='manager');}).length]
 ];
}
function filtered(){
 var q=state.search.trim().toLocaleLowerCase('pt-BR');
 return (state.profiles||[]).filter(function(p){
  var match=!q||(fullName(p)+' '+p.email+' '+roleNames[p.role]+' '+p.department).toLocaleLowerCase('pt-BR').includes(q);
  return match&&(state.department==='all'||p.department===state.department)&&(state.filter==='all'||(state.filter==='active'&&p.active)||(state.filter==='pending'&&!p.active)||state.filter===p.role);
 });
}
function tableHtml(){
 var people=filtered();
 if(!people.length)return '<p class="admin-empty">Nenhum servidor corresponde aos filtros selecionados.</p>';
 return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Servidor</th><th>Perfil</th><th>Setor</th><th>Situação</th><th>Ação</th></tr></thead><tbody>'+people.map(function(p){
   var self=p.id===currentId();
   return '<tr><td><div class="admin-person"><span class="admin-initials">'+escape(shortName(p))+'</span><span><strong>'+escape(fullName(p))+(self?' <small>(você)</small>':'')+'</strong><small>'+escape(p.email)+'</small></span></div></td>'+
   '<td>'+escape(roleNames[p.role]||p.role)+'</td><td>'+escape(p.department)+'</td><td>'+statusPill(p)+'</td><td>'+
   (self?'<span class="mu">Conta protegida</span>':'<button class="btn" style="height:31px" data-admin-edit="'+escape(p.id)+'">Gerenciar</button>')+
   '</td></tr>';
 }).join('')+'</tbody></table></div>';
}
function auditHtml(){
 var items=state.audit||[];
 if(!items.length)return '<p class="mu">Nenhuma alteração administrativa registrada.</p>';
 return '<div class="admin-audit">'+items.slice(0,8).map(function(a){
  var what=a.old_role!==a.new_role?'Perfil: '+(roleNames[a.old_role]||a.old_role)+' → '+(roleNames[a.new_role]||a.new_role):(a.old_active!==a.new_active?(a.new_active?'Conta ativada':'Conta desativada'):'Dados cadastrais atualizados');
  return '<div class="admin-audit-item"><span class="admin-audit-dot"></span><span><b>'+escape(a.target_name||'Servidor')+'</b><small class="mu" style="display:block">'+escape(what)+'</small><small class="mu">'+escape(formatDate(a.created_at))+'</small></span></div>';
 }).join('')+'</div>';
}
function paint(){
 var stats=summary();
 var controlLabel=real()?'Como cadastrar usuário':'Novo usuário de teste';
 document.getElementById('view').innerHTML=
 '<div class="admin-shell">'+
 '<section class="card admin-hero"><div class="admin-kicker">Governança de acesso · DCS HUB</div><h1>Equipe e permissões</h1>'+
 '<p>Gerencie quem pode consultar, criar atividades, confirmar eventos e trabalhar em conjunto. Cada conta tem um perfil e uma unidade responsável.</p></section>'+
 (!real()?'<div class="admin-hint"><b>Ambiente demonstrativo:</b> pessoas e alterações são fictícias e serão perdidas ao recarregar a página. Nenhum usuário real é criado.</div>':
 '<div class="admin-hint"><b>Modo conectado:</b> somente contas existentes no Supabase Auth aparecem aqui. A ativação e as alterações são verificadas pelo banco e registradas em auditoria.</div>')+
 '<div class="admin-metrics">'+stats.map(function(x){return '<div class="card admin-stat"><small>'+escape(x[0])+'</small><strong>'+x[1]+'</strong></div>';}).join('')+'</div>'+
 '<section class="card admin-toolbar"><div class="admin-toolbar-main"><div><h2>Diretório da equipe</h2><p class="mu" style="margin:3px 0 0">Perfis e acessos da Divisão de Comunicação Social</p></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-admin-refresh>Atualizar</button><button class="btn pri" data-admin-add>'+escape(controlLabel)+'</button></div></div>'+
 '<div style="margin-top:14px"><input class="admin-search" id="admin-search" type="search" placeholder="Buscar servidor, e-mail ou setor…" aria-label="Buscar servidores" value="'+escape(state.search)+'"></div>'+
 '<div class="admin-filters"><select class="hub-filter" id="admin-department" aria-label="Filtrar por equipe"><option value="all"'+(state.department==='all'?' selected':'')+'>Todas as equipes</option><option value="DCS"'+(state.department==='DCS'?' selected':'')+'>DCS</option><option value="Cerimonial"'+(state.department==='Cerimonial'?' selected':'')+'>Cerimonial</option></select>'+[['all','Todos'],['active','Ativos'],['pending','Pendentes'],['admin','Administradores'],['manager','Gestores'],['dcs','DCS'],['ceremonial','Cerimonial'],['reader','Leitores']].map(function(x){return '<button class="cp'+(state.filter===x[0]?' on':'')+'" data-admin-filter="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+
 '<div id="admin-table">'+tableHtml()+'</div></section>'+
 '<div class="admin-two-col"><section class="card p"><h2>Histórico de permissões</h2><p class="mu" style="margin:5px 0 10px">Últimas mudanças de perfil, ativação e dados cadastrais.</p>'+auditHtml()+'</section>'+
 '<section class="card p"><h2>Matriz de permissões</h2><p class="mu" style="margin:5px 0 10px">Funções institucionais do HUB.</p>'+
 roles.map(function(x){return '<div class="admin-role-line"><span class="admin-role-icon">◆</span><span><b>'+escape(x[1])+'</b><small class="mu" style="display:block">'+escape(x[2])+'</small></span></div>';}).join('')+
 '<div class="admin-hint">A escolha do perfil na demonstração não equivale à autenticação. Em produção, o Supabase aplica as políticas RLS e a função administrativa.</div></section></div></div>';
}
function openEdit(id){
 var p=(state.profiles||[]).find(function(x){return x.id===id;});if(!p||p.id===currentId())return;
 var body='<h2 style="font-size:21px">Gerenciar acesso</h2><p class="mu">'+escape(p.email)+'</p>'+
 '<form id="admin-edit-form"><input type="hidden" name="id" value="'+escape(id)+'">'+
 '<div class="admin-form-grid"><label>Nome completo<input class="fi" name="full_name" maxlength="120" required value="'+escape(p.full_name)+'"></label>'+
 '<label>Perfil<select class="fi" name="role">'+roles.map(function(r){return option(r[0],r[1],p.role);}).join('')+'</select></label>'+
 '<label>Unidade<select class="fi" name="department">'+option('DCS','DCS',p.department)+option('Cerimonial','Cerimonial',p.department)+'</select></label></div>'+
 '<label style="display:flex;align-items:center;gap:9px"><input type="checkbox" name="active"'+(p.active?' checked':'')+'> Conta ativa (permite acesso ao HUB)</label>'+
 '<p class="admin-hint">Desativar o acesso impede novas operações. Uma sessão já aberta pode precisar ser renovada; as regras do banco são verificadas a cada operação.</p>'+
 '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:17px"><button class="btn" type="button" data-close>Cancelar</button><button class="btn pri" type="submit">Salvar alterações</button></div></form>';
 modal(body);
}
function addDemo(){
 var body='<h2 style="font-size:21px">Novo usuário demonstrativo</h2><p class="mu">Cadastro fictício para testar o fluxo de aprovação. Não cria conta de login.</p>'+
 '<form id="admin-demo-form"><label>Nome completo<input class="fi" name="full_name" maxlength="120" required></label>'+
 '<label>E-mail fictício<input class="fi" type="email" name="email" required placeholder="servidor@exemplo.invalid"></label>'+
 '<div class="admin-form-grid"><label>Perfil inicial<select class="fi" name="role">'+roles.map(function(r){return option(r[0],r[1],'reader');}).join('')+'</select></label>'+
 '<label>Unidade<select class="fi" name="department">'+option('DCS','DCS','DCS')+option('Cerimonial','Cerimonial','DCS')+'</select></label></div>'+
 '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:17px"><button type="button" class="btn" data-close>Cancelar</button><button class="btn pri">Criar pendente</button></div></form>';
 modal(body);
}
function showInstructions(){
 modal('<h2>Cadastro de novos servidores</h2><p>O HUB não cria contas de autenticação diretamente no navegador, pois isso exigiria credenciais administrativas secretas.</p>'+
 '<p>Na instância <b>separada do Supabase DCS HUB</b>, abra <b>Authentication → Users</b> e convide/crie o usuário com e-mail institucional. O banco cria automaticamente um perfil <b>Leitor · Inativo</b>.</p>'+
 '<p>Depois, volte a esta tela, clique em <b>Atualizar</b> e em <b>Gerenciar</b> para definir perfil, unidade e ativar a conta.</p>'+
 '<p class="admin-hint">Antes do uso institucional, valide o domínio do e-mail, o método de convite e as políticas de TI. Não envie convites nem exponha chaves secretas no GitHub.</p>'+
 '<div style="text-align:right;margin-top:16px"><button class="btn pri" data-close>Entendi</button></div>');
}
async function updateProfile(form){
 if(state.busy)return;
 state.busy=true;
 var data=new FormData(form);
 var id=String(data.get('id'));
 var old=(state.profiles||[]).find(function(x){return x.id===id;});
 if(!old){state.busy=false;throw new Error('Conta não encontrada');}
 if(id===currentId()){state.busy=false;throw new Error('Não é permitido alterar o próprio perfil administrativo');}
 var name=String(data.get('full_name')||'').trim();
 var role=String(data.get('role'));var department=String(data.get('department'));var active=data.get('active')==='on';
 if(name.length<2||name.length>120||!roleNames[role]||!['DCS','Cerimonial'].includes(department)){state.busy=false;throw new Error('Preencha os dados corretamente');}
 try{
  if(real()){
   await backend().updateAdminProfile({id:id,full_name:name,role:role,department:department,active:active});
   await fetchData();
  }else{
   old.full_name=name;old.role=role;old.department=department;old.active=active;
   window.DCS_TEAMS?.setDemoMembers(state.profiles);
   state.audit.unshift({actor_id:'demo-adm',target_name:name,old_role:form.dataset.oldRole||'reader',new_role:role,old_active:form.dataset.oldActive==='true',new_active:active,created_at:new Date().toISOString()});
  }
  clearModal();paint();toast('Permissões atualizadas'+(real()?' e auditadas':' (demonstração)'));
 } finally{state.busy=false;}
}
document.addEventListener('click',function(e){
 if(!window.DCS_BRIDGE||window.DCS_BRIDGE.S.route!=='admin')return;
 var f=e.target.closest('[data-admin-filter]');if(f){state.filter=f.dataset.adminFilter;paint();return;}
 var edit=e.target.closest('[data-admin-edit]');if(edit){openEdit(edit.dataset.adminEdit);return;}
 if(e.target.closest('[data-admin-add]')){if(real())showInstructions();else addDemo();return;}
 if(e.target.closest('[data-admin-refresh]')){render();}
});
document.addEventListener('change',function(e){if(e.target.id==='admin-department'){state.department=e.target.value;paint();}});
document.addEventListener('input',function(e){
 if(e.target.id!=='admin-search')return;
 state.search=e.target.value;
 var box=document.getElementById('admin-table');if(box)box.innerHTML=tableHtml();
});
document.addEventListener('submit',function(e){
 if(!window.DCS_BRIDGE||window.DCS_BRIDGE.S.route!=='admin')return;
 if(e.target.id==='admin-edit-form'){
  e.preventDefault();if(!canAdmin())return;
  var p=state.profiles.find(function(x){return x.id===new FormData(e.target).get('id');});
  e.target.dataset.oldRole=p.role;e.target.dataset.oldActive=String(p.active);
  var form=e.target;
  var btn=form.querySelector('button[type=submit]');if(btn)btn.disabled=true;
  updateProfile(form).catch(function(err){toast('Erro: '+err.message);}).finally(function(){if(btn)btn.disabled=false;});
 }else if(e.target.id==='admin-demo-form'){
  e.preventDefault();if(real()||!canAdmin())return;
  var d=new FormData(e.target),email=String(d.get('email')).trim().toLowerCase();
  if(state.profiles.some(function(p){return p.email.toLowerCase()===email;})){toast('E-mail fictício já cadastrado');return;}
  var p={id:'demo-'+Date.now(),full_name:String(d.get('full_name')).trim(),email:email,role:d.get('role'),department:d.get('department'),active:false,created_at:new Date().toISOString()};
  state.profiles.unshift(p);clearModal();paint();toast('Usuário fictício cadastrado como pendente');
 }
});
window.DCS_ADMIN={render:render,version:'0.4'};
})();
