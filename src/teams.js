/* DCS HUB 0.7 — Equipes DCS e Cerimonial */
(function(){
'use strict';
const demo=[
 {id:'demo-adm',full_name:'Marina Souza',label:'Marina S.',department:'DCS',role:'admin',active:true},
 {id:'demo-ges',full_name:'Rafael Teixeira',label:'Rafael T.',department:'Cerimonial',role:'manager',active:true},
 {id:'demo-dcs',full_name:'Camila Andrade',label:'Camila A.',department:'DCS',role:'dcs',active:true},
 {id:'demo-cer',full_name:'Bruno Lima',label:'Bruno L.',department:'Cerimonial',role:'ceremonial',active:true},
 {id:'demo-cv',full_name:'Júlia Martins',label:'Júlia M.',department:'DCS',role:'dcs',active:true}
];
let people=null,demoOverride=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const real=()=>!!window.DCS_BACKEND?.enabled;
const bridge=()=>window.DCS_BRIDGE;
function deptFromRole(role){return ['Gestor','Servidor Cerimonial'].includes(role)?'Cerimonial':'DCS';}
function selfLabel(){return 'Você';}
function demoMe(){
 const role=bridge()?.S.role;
 return role==='Administrador'?'Marina S.':role==='Gestor'?'Rafael T.':role==='Servidor DCS'?'Camila A.':role==='Servidor Cerimonial'?'Bruno L.':role==='Leitor'?'Júlia M.':'Marina S.';
}
function demoMembers(){const source=demoOverride||demo;return source.map(p=>({...p,label:p.label||demo.find(x=>x.id===p.id)?.label||p.full_name?.split(' ')[0]||'Equipe'}));}
async function load(){
 if(real()){
  people=await window.DCS_BACKEND.listTeamProfiles();
 }else people=demoMembers();
 return people;
}
function list(){
 if(real())return people||[];
 // Alterar o perfil de demonstração deve atualizar o "Você".
 return demoMembers();
}
function getTeam(label){
 if(label==='Equipe')return null;
 return list().find(p=>p.label===label)?.department||null;
}
function assignable(team){
 const listAll=list();
 return listAll.filter(p=>p.active&&p.role!=='reader'&&(team==='all'||!team||p.department===team));
}
function membersOptions(team,selected='Equipe'){
 const members=assignable(team);
 return '<option value="Equipe"'+(selected==='Equipe'?' selected':'')+'>Equipe (sem responsável individual)</option>'+members.map(p=>
  '<option value="'+esc(p.label)+'"'+(selected===p.label?' selected':'')+'>'+esc(p.full_name)+((p.label==='Você'||(!real()&&p.label===demoMe()))?' (você)':'')+'</option>').join('');
}
function groupOptions(selected='DCS'){
 return [['DCS','Comunicação Social (DCS)'],['Cerimonial','Cerimonial']].map(([id,label])=>'<option value="'+id+'"'+(selected===id?' selected':'')+'>'+label+'</option>').join('');
}
function groupForTask(task){
 if(task.team==='DCS'||task.team==='Cerimonial')return task.team;
 const person=list().find(x=>x.label===task.w);
 return person?.department||'DCS';
}
function normalizeAssignee(label){return !real()&&label==='Você'?demoMe():label;}
function defaultTeam(){return deptFromRole(bridge()?.S.role);}
function taskFormHtml(){
 const team=defaultTeam();
 return '<label>Equipe responsável<select class="fi" name="team" id="task-team" required>'+groupOptions(team)+'</select></label>'+
 '<label>Responsável<select class="fi" id="task-responsible" name="w">'+membersOptions(team)+'</select></label>'+
 '<small class="mu">A lista mostra somente pessoas ativas da equipe escolhida. Com banco configurado, a atribuição gera notificação na conta do servidor.</small>';
}
function filterHtml(selected='all'){
 return '<select class="fi" style="width:auto;min-width:140px;margin:0;height:38px" data-f="tg" aria-label="Filtrar tarefas por equipe"><option value="all">Todas as equipes</option>'+
 '<option value="DCS"'+(selected==='DCS'?' selected':'')+'>DCS</option><option value="Cerimonial"'+(selected==='Cerimonial'?' selected':'')+'>Cerimonial</option></select>';
}
function teamSection(){
 const counts={DCS:list().filter(p=>p.active&&p.department==='DCS').length,Cerimonial:list().filter(p=>p.active&&p.department==='Cerimonial').length};
 return '<div class="hub-stats">'+[['DCS',counts.DCS],['Cerimonial',counts.Cerimonial],['Servidores ativos',counts.DCS+counts.Cerimonial],['Equipes',2]].map(([label,n])=>
  '<div class="card hub-stat"><small>'+esc(label)+'</small><b>'+n+'</b></div>').join('')+'</div>';
}
function render(){
 const view=document.querySelector('#view');
 const groups=[['DCS','Divisão de Comunicação Social','Comunicação visual, exposições e visitas guiadas'],['Cerimonial','Cerimonial','Sessões solenes, receptivo e protocolo']];
 view.innerHTML='<div class="admin-shell"><section class="hub-hero"><div class="hub-kicker">Estrutura organizacional</div><h1>Equipes DCS e Cerimonial</h1><p>Visualize os servidores por grupo e atribua tarefas à equipe correta.</p></section>'+
 teamSection()+
 '<div class="team-grid">'+groups.map(([name,caption,description])=>
 '<section class="card hub-panel"><div class="hub-kicker">'+esc(caption)+'</div><h2>'+name+'</h2><p class="mu">'+esc(description)+'</p>'+
 '<div class="team-members">'+list().filter(p=>p.active&&p.department===name).map(p=>
 '<div class="team-person"><span class="admin-initials">'+esc(p.full_name.split(' ').slice(0,2).map(x=>x[0]).join(''))+'</span><span><b>'+esc(p.full_name)+'</b><small>'+esc(p.label==='Você'?'Sua conta demonstrativa':p.role==='manager'?'Gestor':p.role==='admin'?'Administrador':'Servidor')+'</small></span></div>').join('')+'</div></section>').join('')+'</div>'+
 '<div class="hub-note">A equipe de cada usuário pode ser alterada pelo Administrador em Administração → Gerenciar. Estes dois grupos representam a organização operacional do HUB e não substituem os vínculos formais da ALESP.</div></div>';
}
function refresh(){
 load().then(()=>{if(bridge()?.S?.route==='equipes')render();}).catch(e=>bridge()?.toast('Erro ao carregar equipe: '+e.message));
}
document.addEventListener('change',e=>{
 if(e.target.id==='task-team'){
  const responsible=document.querySelector('#task-responsible');
  if(responsible)responsible.innerHTML=membersOptions(e.target.value,'Equipe');
 }
});
function setDemoMembers(rows){if(real())return;demoOverride=rows.map(p=>({...p,label:demo.find(x=>x.id===p.id)?.label||p.full_name?.split(' ')[0]||'Equipe'}));}
window.DCS_TEAMS={load,list,assignable,groupOptions,membersOptions,groupForTask,defaultTeam,taskFormHtml,filterHtml,render,refresh,getTeam,setDemoMembers,normalizeAssignee};
})();