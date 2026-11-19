/* DCS HUB 0.10 — aceite e comentários em tarefa, prazos sinalizados. */
(function(){
'use strict';
const B=()=>window.DCS_BRIDGE,$=q=>document.querySelector(q);
const real=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commentStore=new Map();let activeThread=null;
function reset(){commentStore.clear();activeThread=null;}
function todayISO(){const d=new Date(),p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
function isOverdue(t){return !!(t?.dueAt&&t.dueAt<todayISO()&&!['Concluído','Cancelado'].includes(t.s));}
function isDueSoon(t){return !!(t?.dueAt&&t.dueAt>=todayISO()&&!['Concluído','Cancelado'].includes(t.s)
 &&new Date(t.dueAt+'T00:00:00').getTime()<=new Date(todayISO()+'T00:00:00').getTime()+86400000);}
function isMine(t){return real()?t.assigneeId===window.DCS_BACKEND.currentUserId():
 (t.w==='Você'||!!window.DCS_DEMO_NOTIFY?.isMine(t.w));}
function canReadComments(t){
 const role=B()?.S?.role;
 if(!real())return role!=='Leitor';
 const me=window.DCS_BACKEND?.currentUserId();
 return ['Administrador','Gestor'].includes(role)||t.assigneeId===me||t.createdBy===me;
}
function canAccept(t){return !!(t&&!t.acceptedAt&&!['Concluído','Cancelado'].includes(t.s)&&B()?.S?.role!=='Leitor'&&isMine(t));}
function cardControls(t){
 if(!t)return '';
 const note=isOverdue(t)?'<span class="task-alert task-overdue">Atrasada</span>':
   isDueSoon(t)?'<span class="task-alert task-soon">Vence em breve</span>':'';
 const acceptance=t.acceptedAt?'<span class="task-alert task-accepted">Aceita</span>':
   (!['Concluído','Cancelado'].includes(t.s)&&(t.assigneeId||t.w&&t.w!=='Equipe'))?'<span class="task-alert task-awaiting">Aguardando aceite</span>':'';
 return '<div class="task-collaboration">'+note+acceptance+'</div><div class="task-buttons">'+
   (canAccept(t)?'<button class="btn pri" data-task-accept="'+esc(t.id)+'" type="button">Aceitar tarefa</button>':'')+
   (canReadComments(t)?'<button class="btn" data-task-comments="'+esc(t.id)+'" type="button">Comentários</button>':'')+
   '</div>';
}
function taskFor(id){return B()?.T?.find(t=>t.id===id);}
function dateLabel(date){try{return new Date(date).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}catch(_){return '';}}
function threadMarkup(task,comments,loadError=''){
 const staff=id=>real()?window.DCS_BACKEND?.profileLabel(id)||'Integrante':'Equipe DCS';
 return '<div class="bk" data-close></div><div class="card md task-thread" role="dialog" aria-modal="true" aria-label="Conversa da tarefa">'+
   '<div class="task-thread-head"><div><div class="hub-kicker">Tarefa · '+esc(task.ev||'Avulsa')+'</div><h2>'+esc(task.t)+'</h2></div><button class="btn" data-close>Fechar</button></div>'+
   '<p class="mu">Conversa entre criador, responsável e gestores. As mensagens ficam vinculadas à tarefa.</p>'+
   '<div class="task-comment-list" aria-label="Histórico de comentários">'+
   (loadError?'<p class="mu">Não foi possível carregar: '+esc(loadError)+'</p>':
     comments.length?comments.map(c=>'<article class="task-comment"><div class="task-comment-meta"><strong>'+esc(staff(c.author_id))+'</strong><small>'+esc(dateLabel(c.created_at))+'</small></div><p>'+esc(c.body)+'</p></article>').join(''):
     '<p class="mu">Nenhum comentário. Registre uma dúvida, atualização ou orientação.</p>')+
   '</div>'+
   (canReadComments(task)?'<form id="task-comment-form"><input type="hidden" name="task_id" value="'+esc(task.id)+'">'+
   '<label>Novo comentário<textarea class="fi" name="body" maxlength="2000" rows="3" required placeholder="Escreva uma orientação ou atualização concreta…"></textarea></label>'+
   '<div class="hub-actions" style="justify-content:flex-end"><button class="btn pri" type="submit">Enviar comentário</button></div></form>':'')+
   '<p class="hub-note">Não compartilhe dados pessoais sensíveis neste campo. Os avisos são internos, não enviados por e-mail ou Teams nesta versão.</p></div>';
}
async function openThread(id){
 const task=taskFor(id);
 if(!task)return B()?.toast('Tarefa não encontrada');
 if(!canReadComments(task))return B()?.toast('Somente os envolvidos podem acessar os comentários');
 activeThread=id;
 $('#ov').innerHTML='<div class="bk" data-close></div><div class="card md task-thread" role="dialog"><h2>Carregando comentários…</h2></div>';
 try{
  const items=real()?await window.DCS_BACKEND.listTaskComments(id):commentStore.get(id)||[];
  if(activeThread!==id)return;
  $('#ov').innerHTML=threadMarkup(task,items);
 }catch(e){if(activeThread===id)$('#ov').innerHTML=threadMarkup(task,[],e.message||'Falha de consulta');}
}
async function addComment(form){
 const data=new FormData(form),id=String(data.get('task_id')),body=String(data.get('body')||'').trim();
 if(!body||body.length>2000)throw new Error('Escreva de 1 a 2.000 caracteres.');
 if(!taskFor(id))throw new Error('Tarefa não encontrada.');
 if(real())await window.DCS_BACKEND.addTaskComment(id,body);
 else{
  const old=commentStore.get(id)||[];
  old.push({id:'demo-comment-'+Date.now(),task_id:id,author_id:'demo',body,created_at:new Date().toISOString()});
  commentStore.set(id,old);
 }
 await openThread(id);
 B()?.toast(real()?'Comentário registrado no banco':'Comentário registrado apenas nesta demonstração');
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-close]'))activeThread=null;
 const accept=e.target.closest('[data-task-accept]');
 if(accept){
  const task=taskFor(accept.dataset.taskAccept);
  if(!task||!canAccept(task))return;
  accept.disabled=true;
  if(real())window.DCS_BACKEND.run(()=>window.DCS_BACKEND.acceptTask(task.id));
  else{task.acceptedAt=new Date().toISOString();B()?.rr();B()?.toast('Aceite demonstrativo registrado');}
  return;
 }
 const comment=e.target.closest('[data-task-comments]');
 if(comment){openThread(comment.dataset.taskComments);return;}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='task-comment-form')return;
 e.preventDefault();
 const form=e.target,btn=form.querySelector('button[type=submit]');
 if(btn)btn.disabled=true;
 addComment(form).catch(err=>B()?.toast('Erro ao comentar: '+err.message))
   .finally(()=>{if(btn?.isConnected)btn.disabled=false;});
});
window.DCS_TASKS={cardControls,isOverdue,isDueSoon,canAccept,canReadComments,openThread,reset};
})();