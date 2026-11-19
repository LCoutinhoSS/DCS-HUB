/* DCS HUB v0.9 — Reuniões preparatórias vinculadas ao evento.
 * Dados reais via RLS no Supabase; demonstração usa memória nesta aba.
 */
(function(){
'use strict';
let meetings=[],selected=null;
const B=()=>window.DCS_BRIDGE;
const $=q=>document.querySelector(q);
const real=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={agendada:'Agendada',realizada:'Realizada',cancelada:'Cancelada'};
function setData(items){if(real())meetings=items||[];}
function reset(){meetings=[];selected=null;}
function get(id){return meetings.find(x=>x.id===id);}
function eventMeetings(eventId){return meetings.filter(m=>m.event_id===eventId).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at));}
function formatDate(value){try{return new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}catch(_){return 'A definir';}}
function toInputDate(value){
 const date=value?new Date(value):new Date(Date.now()+3600000);
 const pad=n=>String(n).padStart(2,'0');
 return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes());
}
function cards(eventId){
 const list=eventMeetings(eventId);
 if(!list.length)return '<div class="meeting-empty"><h3>Sem reuniões preparatórias registradas</h3>'+
 '<p class="mu">Agende a primeira reunião, registre a pauta e transforme os encaminhamentos em tarefas com responsável e prazo.</p></div>';
 return list.map(m=>{
  const tasks=(B()?.T||[]).filter(t=>t.meeting_id===m.id);
  const expanded=selected===m.id;
  return '<article class="meeting-item"><div class="meeting-summary">'+
   '<div><div class="hub-kicker">'+esc(formatDate(m.starts_at))+' · '+esc(m.format||'presencial')+'</div>'+
   '<h3>'+esc(m.title)+'</h3><p>'+esc(labels[m.status]||m.status)+' · '+tasks.length+' encaminhamento(s) atribuído(s)</p></div>'+
   '<div class="hub-actions"><button class="btn" data-meeting-toggle="'+esc(m.id)+'">'+(expanded?'Recolher':'Ver pauta e ata')+'</button>'+
   (B()?.S.role==='Leitor'?'':'<button class="btn" data-meeting-edit="'+esc(m.id)+'">Editar</button>')+'</div></div>'+
   (expanded?'<div class="meeting-detail"><div class="meeting-kv"><b>Participantes</b><p>'+esc(m.attendees||'Não informados')+'</p></div>'+
   '<div class="meeting-kv"><b>Pauta</b><p>'+esc(m.agenda||'A definir')+'</p></div>'+
   '<div class="meeting-kv"><b>Ata / registro</b><p>'+esc(m.minutes||'A preencher após a reunião')+'</p></div>'+
   '<div class="meeting-kv"><b>Decisões e encaminhamentos</b><p>'+esc(m.decisions||'Nenhuma decisão registrada')+'</p></div>'+
   '<h4>Tarefas originadas nesta reunião</h4>'+
   (tasks.length?tasks.map(t=>'<div class="meeting-task"><b>'+esc(t.t)+'</b><small>'+esc(t.w)+' · '+esc(t.due)+' · '+esc(t.s)+'</small></div>').join(''):'<p class="mu">Sem tarefas vinculadas.</p>')+
   (B()?.S.role==='Leitor'?'':'<button class="btn pri" data-meeting-task="'+esc(m.id)+'">+ Criar tarefa de encaminhamento</button>')+'</div>':'')+
   '</article>';
 }).join('');
}
function renderEvent(ev){
 const list=eventMeetings(ev.id);
 return '<div class="meeting-hub"><div class="meeting-header"><div><h2>Reuniões preparatórias</h2><p class="mu">'+list.length+' reunião(ões) vinculada(s) a este evento. Pautas, atas e encaminhamentos ficam no mesmo lugar.</p></div>'+
 (B()?.S.role==='Leitor'?'':'<button class="btn pri" data-meeting-add="'+esc(ev.id)+'">+ Agendar reunião</button>')+
 '</div>'+cards(ev.id)+'</div>';
}
function showForm(eventId,meetingId){
 if(B()?.S.role==='Leitor')return;
 const event=B()?.E?.find(e=>e.id===eventId),m=meetingId?get(meetingId):null;
 if(!event){B()?.toast('Evento indisponível');return;}
 const option=(v,l)=>'<option value="'+v+'"'+((m?.[v]||m?.format||'presencial')===v?' selected':'')+'>'+l+'</option>';
 const st=(v,l)=>'<option value="'+v+'"'+((m?.status||'agendada')===v?' selected':'')+'>'+l+'</option>';
 $('#ov').innerHTML='<div class="bk" data-close></div><form class="card md meeting-form" id="meeting-form" role="dialog" aria-modal="true" aria-label="Reunião preparatória">'+
 '<h2>'+(m?'Editar reunião':'Agendar reunião')+'</h2><p class="mu">'+esc(event.t)+'</p>'+
 '<input type="hidden" name="id" value="'+esc(m?.id||'')+'"><input type="hidden" name="event_id" value="'+esc(eventId)+'">'+
 '<label>Título da reunião<input class="fi" name="title" required maxlength="160" value="'+esc(m?.title||'Reunião preparatória')+'"></label>'+
 '<div class="flow-grid"><label>Data e hora<input class="fi" type="datetime-local" name="starts_at" required value="'+esc(toInputDate(m?.starts_at))+'"></label>'+
 '<label>Duração estimada (minutos)<input class="fi" type="number" name="duration_minutes" min="15" max="720" step="15" required value="'+Number(m?.duration_minutes||60)+'"></label></div>'+
 '<div class="flow-grid"><label>Modalidade<select class="fi" name="format">'+[['presencial','Presencial'],['hibrida','Híbrida'],['virtual','Virtual']].map(([v,l])=>'<option value="'+v+'"'+((m?.format||'presencial')===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label>'+
 '<label>Situação<select class="fi" name="status">'+[['agendada','Agendada'],['realizada','Realizada'],['cancelada','Cancelada']].map(([v,l])=>st(v,l)).join('')+'</select></label></div>'+
 '<label>Participantes / setores<textarea class="fi" name="attendees" maxlength="2500" rows="2" placeholder="Equipes e convidados">'+esc(m?.attendees||'')+'</textarea></label>'+
 '<label>Pauta<textarea class="fi" name="agenda" maxlength="5000" rows="4" placeholder="Assuntos que precisam de decisão">'+esc(m?.agenda||'')+'</textarea></label>'+
 '<label>Ata / registro<textarea class="fi" name="minutes" maxlength="8000" rows="4" placeholder="O que foi discutido">'+esc(m?.minutes||'')+'</textarea></label>'+
 '<label>Decisões e encaminhamentos<textarea class="fi" name="decisions" maxlength="8000" rows="4" placeholder="O que foi decidido, próximos passos e pendências">'+esc(m?.decisions||'')+'</textarea></label>'+
 '<p class="hub-note">Para atribuir um encaminhamento a alguém, salve a reunião e use "Criar tarefa de encaminhamento". A tarefa ficará associada à reunião e notificará o responsável dentro do HUB.</p>'+
 '<div class="hub-actions" style="justify-content:flex-end"><button type="button" class="btn" data-close>Cancelar</button><button class="btn pri" type="submit">Salvar reunião</button></div></form>';
}
async function saveMeeting(form){
 const f=new FormData(form),id=String(f.get('id')||''),eventId=String(f.get('event_id')||'');
 const value=String(f.get('starts_at')||'');const d=new Date(value);
 const data={title:String(f.get('title')||'').trim(),starts_at:d.toISOString(),
   duration_minutes:Number(f.get('duration_minutes')),format:String(f.get('format')),
   status:String(f.get('status')),attendees:String(f.get('attendees')||''),
   agenda:String(f.get('agenda')||''),minutes:String(f.get('minutes')||''),decisions:String(f.get('decisions')||'')};
 if(data.title.length<3||!Number.isFinite(d.getTime())||data.duration_minutes<15||data.duration_minutes>720)throw Error('Preencha título, data e duração');
 if(real()){
  if(id)await window.DCS_BACKEND.updateMeeting(id,data);
  else await window.DCS_BACKEND.createMeeting({...data,event_id:eventId});
 }else if(id)Object.assign(get(id),data,{updated_at:new Date().toISOString()});
 else meetings.unshift({...data,id:'demo-meet-'+Date.now(),event_id:eventId,created_at:new Date().toISOString(),created_by:'demo-me'});
 selected=id||meetings.find(x=>x.event_id===eventId&&x.title===data.title)?.id||null;
 B().closeOv();
 if(B().S.route==='eventos'){B().S.ev=eventId;B().S.tb='preps';B().rr();}
 B().toast('Reunião salva'+(real()?' no banco':' na demonstração'));
}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-meeting-add]');
 if(add){showForm(add.dataset.meetingAdd,null);return;}
 const edit=e.target.closest('[data-meeting-edit]');
 if(edit){showForm(get(edit.dataset.meetingEdit)?.event_id,edit.dataset.meetingEdit);return;}
 const toggle=e.target.closest('[data-meeting-toggle]');
 if(toggle){selected=selected===toggle.dataset.meetingToggle?null:toggle.dataset.meetingToggle;B().rr();return;}
 const task=e.target.closest('[data-meeting-task]');
 if(task){const m=get(task.dataset.meetingTask);if(!m)return;B().openNt(m.event_id,m.id);}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='meeting-form')return;
 e.preventDefault();const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;
 saveMeeting(e.target).catch(err=>B()?.toast('Erro ao salvar reunião: '+err.message))
  .finally(()=>{if(btn.isConnected)btn.disabled=false;});
});
window.DCS_MEETINGS={renderEvent,setData,eventMeetings,get,reset};
})();