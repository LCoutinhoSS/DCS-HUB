/* DCS HUB 0.8 · Criação de eventos orientada por fluxo, com tarefas por pessoa */
(function(){
'use strict';
const $=q=>document.querySelector(q),B=()=>window.DCS_BRIDGE;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds=()=>window.DCS_CHECKLISTS?.TYPES||[];
const ck=()=>window.DCS_CHECKLISTS;
const live=()=>!!window.DCS_BACKEND?.enabled;
let step=0,busy=false;
const steps=['Tipo e solicitante','Data, local e pauta','Tarefas por responsável','Conferência'];
const pad=n=>String(n).padStart(2,'0');
function isoDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function meetingFields(){
 return '<section class="flow-meeting" id="flow-meeting"><div class="flow-subheading"><b>Ficha detalhada da reunião</b><small>Para que ninguém dependa de mensagens soltas</small></div>'+
 '<div class="flow-grid"><label>Modalidade<select class="fi" name="meeting_format"><option>Presencial</option><option>Híbrida</option><option>Virtual</option></select></label>'+
 '<label>Duração prevista (minutos)<input class="fi" type="number" name="duration_min" min="15" max="720" step="15" value="60"></label></div>'+
 '<label>Objetivo da reunião<textarea class="fi" name="purpose" maxlength="2000" placeholder="Que decisão ou alinhamento deve sair desta reunião?"></textarea></label>'+
 '<label>Pauta (um assunto por linha)<textarea class="fi" name="agenda_text" maxlength="5000" placeholder="1. Alinhamento de responsabilidades&#10;2. Prazos&#10;3. Próximos passos"></textarea></label>'+
 '<label>Participantes e áreas envolvidas<textarea class="fi" name="attendees" maxlength="2500" placeholder="Deputados, assessorias, convidados e equipes"></textarea></label>'+
 '<div class="flow-grid"><label>Quem lavrará a ata?<input class="fi" name="minutes_owner" maxlength="160" placeholder="Servidor designado"></label>'+
 '<label>Recursos e estrutura<input class="fi" name="resources" maxlength="350" placeholder="Projetor, áudio, acessibilidade…"></label></div>'+
 '<label>Decisões e encaminhamentos (preencher após a reunião)<textarea class="fi" name="decisions" maxlength="4000" placeholder="O que ficou decidido? Quem fará o quê?"></textarea></label></section>';
}
function checklistRows(kind){
 const tasks=ck().items(kind);
 const sections=[...new Set(tasks.map(t=>t.section))];
 const team=$('#event-wizard-form')?.elements?.namedItem('team')?.value||window.DCS_TEAMS?.defaultTeam()||'DCS';
 const options=window.DCS_TEAMS?.membersOptions(team)||'<option value="Equipe">Atribuir depois</option>';
 return '<div class="flow-assign-header"><b>'+tasks.length+' itens do modelo</b><span>Não marque tarefas não aplicáveis</span></div>'+
 sections.map(section=>'<section class="flow-checklist-group"><h3>'+esc(section)+' <small>'+tasks.filter(t=>t.section===section).length+' itens</small></h3>'+
 tasks.filter(t=>t.section===section).map(item=>
 '<div class="flow-checklist-item"><label class="flow-item-title"><input type="checkbox" name="inc_'+item.id+'"'+(item.optional?'':' checked')+'><span>'+esc(item.title)+
 (item.optional?'<small class="flow-optional">Condicional · selecione se necessário</small>':'')+'</span></label>'+
 '<div class="flow-row-controls"><select class="fi" name="who_'+item.id+'" aria-label="Responsável: '+esc(item.title)+'">'+options+'</select>'+
 '<input class="fi" name="due_'+item.id+'" type="date" aria-label="Prazo: '+esc(item.title)+'"></div></div>').join('')+
 '</section>').join('');
}
function createMarkup(date){
 const d=date instanceof Date?date:new Date(Date.now()+86400000);
 const ty=kinds(),defaultKind='sessao_solene';
 return '<div class="bk" data-close></div><div class="card flow-sheet" role="dialog" aria-modal="true" aria-label="Criar atividade" id="flow-sheet">'+
 '<div class="flow-top"><div><span class="hub-kicker">Nova atividade · Planejamento guiado</span><h2>Criar evento sem esquecer etapas</h2><p>Informe o solicitante, organize a reunião e atribua os itens do checklist.</p></div><button class="ib" data-close type="button" aria-label="Fechar">×</button></div>'+
 '<div class="flow-progress">'+steps.map((s,i)=>'<button type="button" data-flow-step="'+i+'" class="flow-step'+(i===0?' active':'')+'"><span>'+(i+1)+'</span>'+esc(s)+'</button>').join('')+'</div>'+
 '<form id="event-wizard-form" class="flow-form">'+
 '<section class="flow-pane" data-pane="0"><div class="flow-section-title">01 / Informações essenciais</div>'+
 '<label>Tipo de evento<select class="fi" name="kind" id="flow-kind" required>'+ty.map(([id,label])=>'<option value="'+id+'">'+esc(label)+'</option>').join('')+'</select></label>'+
 '<label>Título claro e objetivo<input class="fi" name="t" maxlength="160" required placeholder="Ex.: Audiência pública sobre mobilidade no Alto Tietê"></label>'+
 (window.DCS_REQUESTERS?.picker()||'<p>Carregando solicitantes…</p>')+
 '<div class="flow-grid"><label>Equipe organizadora<select class="fi" name="team">'+(window.DCS_TEAMS?.groupOptions('DCS')||'<option>DCS</option>')+'</select></label>'+
 '<label>Contato do gabinete/solicitante<input class="fi" name="contact" maxlength="180" placeholder="Contato de trabalho (sem dados sensíveis)"></label></div>'+
 '<label>Contexto do pedido<textarea class="fi" name="description" maxlength="2000" placeholder="O que foi solicitado? Quais são as condições já conhecidas?"></textarea></label>'+
 '<div class="hub-note">Solicitante, responsável pelo planejamento e executor de tarefas são funções diferentes. O cadastro não constitui autorização de uso do espaço.</div></section>'+
 '<section class="flow-pane" data-pane="1" hidden><div class="flow-section-title">02 / Agenda e preparação</div>'+
 '<div class="flow-grid"><label>Data de início<input class="fi" name="d" type="date" required value="'+isoDate(d)+'"></label>'+
 '<label>Horário de início<input class="fi" name="h" type="time" required value="10:00"></label>'+
 '<label>Data de término<input class="fi" name="e" type="date" value="'+isoDate(d)+'"></label>'+
 '<label>Horário de término<input class="fi" name="end_h" type="time" value="11:00"></label></div>'+
 (window.DCS_VENUES?.selectMarkup()||'<p>Carregando espaços…</p>')+
 '<div class="flow-grid"><label>Público estimado<input class="fi" name="audience" type="number" min="0" max="100000" placeholder="Ex.: 120"></label>'+
 '<label>Pessoas/autoridades principais<input class="fi" name="guests" maxlength="300" placeholder="Convidados principais"></label></div>'+
 meetingFields()+
 '<label>Observações operacionais<textarea class="fi" name="notes" maxlength="2000" placeholder="Acessibilidade, montagem, necessidades técnicas, providências…"></textarea></label></section>'+
 '<section class="flow-pane" data-pane="2" hidden><div class="flow-section-title">03 / Tarefas e responsáveis</div>'+
 '<p class="mu">O modelo da planilha foi convertido em etapas. Você decide quais se aplicam e pode indicar uma pessoa e um prazo para cada uma. Itens sem pessoa ficam na fila da equipe.</p>'+
 '<div id="flow-task-list">'+checklistRows(defaultKind)+'</div>'+
 '<div class="hub-note">No banco real, o gestor confirma o evento antes de disparar as tarefas geradas e seus avisos. Tarefas manuais criadas na área do evento são atribuídas imediatamente.</div></section>'+
 '<section class="flow-pane" data-pane="3" hidden><div class="flow-section-title">04 / Conferir antes de salvar</div><div id="flow-review"></div>'+
 '<label class="flow-review-consent"><input type="checkbox" name="ack" required> Confirmo que estas informações são de homologação e que a reserva do espaço segue o procedimento institucional.</label></section>'+
 '<div class="flow-bottom"><button class="btn" type="button" data-flow-prev>Voltar</button><span class="flow-current">Etapa 1 de 4</span><button class="btn pri" type="button" data-flow-next>Continuar</button><button class="btn pri" type="submit" data-flow-save hidden>Criar evento e planejamento</button></div></form></div>';
}
function showStep(next){
 step=Math.max(0,Math.min(3,next));
 document.querySelectorAll('#flow-sheet [data-pane]').forEach(x=>{x.hidden=Number(x.dataset.pane)!==step;});
 document.querySelectorAll('#flow-sheet [data-flow-step]').forEach(x=>{const n=Number(x.dataset.flowStep);x.classList.toggle('active',n===step);x.classList.toggle('done',n<step);});
 $('[data-flow-prev]').hidden=step===0;
 $('[data-flow-next]').hidden=step===3;
 $('[data-flow-save]').hidden=step!==3;
 $('.flow-current').textContent='Etapa '+(step+1)+' de 4';
 if(step===3)review();
 const panel=$('#flow-sheet');panel.scrollTop=0;
}
function updateKind(){
 const kind=$('#flow-kind')?.value||'sessao_solene';
 const meeting=$('#flow-meeting');
 if(meeting)meeting.hidden=kind!=='reuniao';
 const teamSelect=$('#event-wizard-form')?.elements?.namedItem('team');
 if(teamSelect)teamSelect.value=['sessao_solene','audiencia_publica','cursos_palestras','recepcao_autoridades','velorio'].includes(kind)?'Cerimonial':'DCS';
 const container=$('#flow-task-list');if(container)container.innerHTML=checklistRows(kind);
}
function validate(stepNumber){
 const frm=$('#event-wizard-form');
 if(stepNumber===0){
  for(const name of ['kind','t','requester_id']){const field=frm.elements.namedItem(name);if(!field?.value){field?.focus();B().toast('Preencha tipo, título e solicitante');return false;}}
 }
 if(stepNumber===1){
  for(const name of ['d','h','e','end_h','venue_id']){
   const field=frm.elements.namedItem(name);if(!field?.value){field?.focus();B().toast('Informe data, horário e espaço da ALESP');return false;}
  }
  const f=new FormData(frm);
  const start=new Date(f.get('d')+'T'+f.get('h')),end=new Date(f.get('e')+'T'+f.get('end_h'));
  if(!(end>start)){B().toast('O término precisa ser posterior ao início');return false;}
  if(f.get('kind')==='reuniao'&&!String(f.get('purpose')||'').trim()){B().toast('Explique o objetivo da reunião');return false;}
 }
 return true;
}
function collect(){
 const frm=$('#event-wizard-form'),f=new FormData(frm);
 const kind=String(f.get('kind')),info=ck().find(kind);
 const req=window.DCS_REQUESTERS?.get(f.get('requester_id'));
 const venue=window.DCS_VENUES?.get(f.get('venue_id'));
 if(!req?.active||!venue?.active)throw new Error('Escolha solicitante e espaço ativos');
 const team=String(f.get('team'))==='Cerimonial'?'Cerimonial':'DCS';
 const tasks=ck().items(kind).map(x=>{
  const label=String(f.get('who_'+x.id)||'Equipe');
  const normalized=window.DCS_TEAMS?.normalizeAssignee(label)||label;
  const resolved=window.DCS_TEAMS?.list().find(p=>p.label===normalized);
  return {title:x.title,section:x.section,position:Number(x.id.split('-').pop()),applicable:!!f.get('inc_'+x.id),
   assignee_label:resolved?.label||'Equipe',team:resolved?.department||team,due_at:f.get('due_'+x.id)||null,priority:'medium'};
 });
 const briefing={
  contact:String(f.get('contact')||''),description:String(f.get('description')||''),
  audience:Number(f.get('audience')||0),guests:String(f.get('guests')||''),notes:String(f.get('notes')||''),
  meeting_format:String(f.get('meeting_format')||''),duration_min:Number(f.get('duration_min')||0),
  purpose:String(f.get('purpose')||''),agenda_text:String(f.get('agenda_text')||''),
  attendees:String(f.get('attendees')||''),minutes_owner:String(f.get('minutes_owner')||''),
  resources:String(f.get('resources')||''),decisions:String(f.get('decisions')||'')
 };
 return {title:String(f.get('t')||'').trim(),kind,category:info[2],
  requester_id:req.id,requester_name:req.name,venue_id:venue.id,venue_name:venue.name,team,
  start_date:String(f.get('d')),start_time:String(f.get('h')),
  end_date:String(f.get('e')),end_time:String(f.get('end_h')),
  briefing,tasks};
}
function review(){
 const box=$('#flow-review');if(!box)return;
 try{
  const data=collect(),app=data.tasks.filter(x=>x.applicable);
  const people=app.filter(x=>x.assignee_label!=='Equipe');
  box.innerHTML='<div class="flow-review-grid">'+[
   ['Atividade',data.title],['Tipo',ck().find(data.kind)[1]],['Solicitante',data.requester_name],
   ['Local',data.venue_name],['Início',data.start_date+' '+data.start_time],['Término',data.end_date+' '+data.end_time],
   ['Equipe',data.team],['Itens aplicáveis',app.length+' de '+data.tasks.length],
   ['Tarefas atribuídas',people.length+' pessoa(s) definida(s)']
  ].map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v||'Não informado')+'</strong></div>').join('')+'</div>'+
  '<div class="hub-note">A criação deixa o evento PENDENTE. Após confirmação do gestor, o banco gera tarefas sem duplicar, com os responsáveis definidos. Essa confirmação não é reserva de espaço.</div>';
 }catch(e){box.textContent=e.message;}
}
async function save(){
 if(busy)return;const form=$('#event-wizard-form');
 if(!form.elements.namedItem('ack')?.checked){B().toast('Confirme as informações de homologação');return;}
 const data=collect();busy=true;
 const button=$('[data-flow-save]');button.disabled=true;
 try{
  if(live())await window.DCS_BACKEND.createFlowEvent(data);
  else B().createFlowDemo(data);
  B().closeOv();window.location.hash='eventos';B().toast('Evento registrado com o modelo de checklist');
 }catch(e){B().toast('Não foi possível criar: '+e.message);}
 finally{busy=false;if(button?.isConnected)button.disabled=false;}
}
async function openCreate(date){
 if(B().S.role==='Leitor'){B().toast('Leitor: somente consulta');return;}
 await Promise.all([window.DCS_REQUESTERS.load(),window.DCS_VENUES.load(),window.DCS_TEAMS.load()]);
 document.querySelector('#ov').innerHTML=createMarkup(date);
 updateKind();showStep(0);
}
function extraHtml(ev){
 const b=ev.briefing||{};
 const row=(a,v)=>'<div class="flow-detail"><small>'+esc(a)+'</small><b>'+esc(v||'Não informado')+'</b></div>';
 return '<div class="flow-event-info"><div class="flow-detail-grid">'+row('Solicitante',ev.requester_name)+
 row('Tipo de atividade',ck().find(ev.kind||ck().byCategory[ev.c])[1])+
 row('Equipe de execução',ev.team||'Não informada')+
 row('Contatos de planejamento',b.contact)+
 row('Público previsto',b.audience)+row('Participantes principais',b.guests)+
 '</div>'+(b.description?'<h3>Contexto da solicitação</h3><p>'+esc(b.description)+'</p>':'')+
 (b.notes?'<h3>Informações operacionais</h3><p>'+esc(b.notes)+'</p>':'')+'</div>';
}
function meetingHtml(ev){
 const b=ev.briefing||{};
 const row=(a,v)=>'<div class="flow-detail"><small>'+esc(a)+'</small><p>'+esc(v||'A definir')+'</p></div>';
 return '<div class="flow-event-info"><h2>Pauta e registro de reunião</h2><p class="mu">Esta ficha concentra os preparativos e os encaminhamentos da reunião.</p>'+
 '<div class="flow-detail-grid">'+row('Objetivo',b.purpose)+row('Modalidade',b.meeting_format)+
 row('Duração estimada',b.duration_min?b.duration_min+' minutos':'A definir')+
 row('Responsável pela ata',b.minutes_owner)+
 row('Participantes',b.attendees)+row('Recursos',b.resources)+'</div>'+
 '<h3>Pauta</h3><p class="flow-pre">'+esc(b.agenda_text||'Pauta não preenchida')+'</p>'+
 '<h3>Decisões e encaminhamentos</h3><p class="flow-pre">'+esc(b.decisions||'A registrar após a reunião')+'</p>'+
 '<div class="hub-actions"><button class="btn" data-flow-meeting-edit="'+esc(ev.id)+'">Editar pauta e decisões</button><button class="btn pri" data-nt="'+esc(ev.id)+'">+ Tarefa para encaminhamento</button></div></div>';
}
function checklistHtml(ev){
 const cklist=ev.chk||[],sections=[...new Set(cklist.map(x=>x.section||'Etapas'))];
 return '<div class="flow-event-info">'+sections.map(section=>
 '<div class="flow-checklist-group"><h3>'+esc(section)+'</h3>'+
 cklist.map((x,i)=>({x,i})).filter(z=>(z.x.section||'Etapas')===section).map(({x,i})=>
 '<div class="flow-checklist-item"><button class="tk'+(x.d?' dn':'')+'" data-ck="'+esc(ev.id)+':'+i+'" role="checkbox" aria-checked="'+!!x.d+'"><span class="cb"></span><b>'+esc(x.x)+'</b></button>'+
 '<small>'+esc(x.assignee_label||x.assignee||'Equipe')+' · '+(x.applicable===false?'Não aplicável':x.d?'Concluído':'Pendente')+'</small>'+(B().S.role==='Leitor'?'':'<button class="btn" data-flow-delegate="'+esc(ev.id)+':'+i+'">Delegar</button>')+'</div>').join('')+
 '</div>').join('')+'</div>';
}
function delegationModal(eventId,index){
 const ev=B().E.find(e=>e.id===eventId),item=ev?.chk[index];
 if(!ev||!item||B().S.role==='Leitor')return;
 const team=item.team||ev.team||'DCS';
 document.querySelector('#ov').innerHTML='<div class="bk" data-close></div><form class="card md" id="flow-assign-form" role="dialog" aria-modal="true" aria-label="Delegar etapa">'+
 '<h2>Delegar uma etapa</h2><p class="mu">'+esc(item.x)+'</p>'+
 '<input type="hidden" name="event" value="'+esc(eventId)+'"><input type="hidden" name="idx" value="'+index+'">'+
 '<label>Equipe<select class="fi" name="team" id="flow-delegation-team">'+(window.DCS_TEAMS?.groupOptions(team)||'<option>DCS</option>')+'</select></label>'+
 '<label>Responsável<select class="fi" name="assignee" id="flow-delegation-person">'+(window.DCS_TEAMS?.membersOptions(team,item.assignee_label||'Equipe')||'<option>Equipe</option>')+'</select></label>'+
 '<label>Prazo<input class="fi" type="date" name="due" value="'+esc(item.due_at||'')+'"></label>'+
 '<p class="hub-note">Se o evento estiver confirmado, atribuir uma pessoa cria/atualiza sua tarefa e, com Supabase ativo, gera o aviso interno. Sem pessoa definida, permanece apenas no checklist.</p>'+
 '<div class="hub-actions" style="justify-content:flex-end"><button class="btn" type="button" data-close>Cancelar</button><button class="btn pri">Salvar atribuição</button></div></form>';
}
async function submitDelegation(form){
 const data=new FormData(form),id=String(data.get('event')),index=Number(data.get('idx'));
 const ev=B().E.find(x=>x.id===id),item=ev?.chk[index];
 if(!item)throw new Error('Etapa indisponível');
 const team=String(data.get('team')),raw=String(data.get('assignee'));
 if(!['DCS','Cerimonial'].includes(team))throw new Error('Equipe inválida');
 const label=window.DCS_TEAMS?.normalizeAssignee(raw)||raw;
 if(label!=='Equipe'){
  const person=window.DCS_TEAMS?.list().find(x=>x.label===label&&x.active&&x.department===team&&x.role!=='reader');
  if(!person)throw new Error('Selecione servidor ativo da equipe');
 }
 if(live())await window.DCS_BACKEND.delegateChecklistItem(id,index,label,team,data.get('due'));
 else{
  item.assignee_label=label;item.team=team;item.due_at=data.get('due')||null;item.applicable=true;
  if(ev.st==='Confirmado')B().generateDemoTasks(ev);
  B().rr();
 }
 B().closeOv();B().toast('Etapa delegada'+(live()?' no banco':' na demonstração'));
}
function meetingModal(id){
 const ev=B().E.find(e=>e.id===id);if(!ev||B().S.role==='Leitor')return;
 const b=ev.briefing||{};
 const field=(label,name,value,rows=3)=>'<label>'+label+'<textarea class="fi" name="'+name+'" rows="'+rows+'" maxlength="5000">'+esc(value||'')+'</textarea></label>';
 document.querySelector('#ov').innerHTML='<div class="bk" data-close></div><form class="card md" id="flow-meeting-form" role="dialog" aria-modal="true" aria-label="Editar pauta e decisões">'+
 '<h2>Atualizar pauta e decisões</h2><p class="mu">'+esc(ev.t)+'</p><input type="hidden" name="event" value="'+esc(id)+'">'+
 field('Objetivo','purpose',b.purpose,2)+field('Pauta','agenda_text',b.agenda_text,4)+
 field('Participantes','attendees',b.attendees,3)+field('Decisões e encaminhamentos','decisions',b.decisions,5)+
 '<div class="hub-actions" style="justify-content:flex-end"><button class="btn" data-close type="button">Cancelar</button><button class="btn pri">Salvar alterações</button></div></form>';
}
async function submitMeeting(form){
 const fd=new FormData(form),id=String(fd.get('event'));
 const patch={purpose:String(fd.get('purpose')||'').slice(0,2000),agenda_text:String(fd.get('agenda_text')||'').slice(0,5000),
 attendees:String(fd.get('attendees')||'').slice(0,2500),decisions:String(fd.get('decisions')||'').slice(0,4000)};
 if(live())await window.DCS_BACKEND.updateMeetingBriefing(id,patch);
 else{
  const ev=B().E.find(e=>e.id===id);if(!ev)throw Error('Reunião não encontrada');
  ev.briefing={...ev.briefing,...patch};ev.hist.unshift('Pauta e encaminhamentos atualizados');
  B().rr();
 }
 B().closeOv();B().toast('Informações da reunião atualizadas');
}
document.addEventListener('click',e=>{
 const delegate=e.target.closest('[data-flow-delegate]');if(delegate){const [id,i]=delegate.dataset.flowDelegate.split(':');delegationModal(id,Number(i));return;}
 const meeting=e.target.closest('[data-flow-meeting-edit]');if(meeting){meetingModal(meeting.dataset.flowMeetingEdit);return;}
 if(!e.target.closest('#flow-sheet'))return;
 if(e.target.closest('[data-flow-next]')){if(validate(step))showStep(step+1);return;}
 if(e.target.closest('[data-flow-prev]')){showStep(step-1);return;}
 const nav=e.target.closest('[data-flow-step]');
 if(nav&&Number(nav.dataset.flowStep)<step)showStep(Number(nav.dataset.flowStep));
});
document.addEventListener('change',e=>{
 if(e.target.id==='flow-kind')updateKind();
 if(e.target.id==='flow-delegation-team'){const sel=$('#flow-delegation-person');if(sel)sel.innerHTML=window.DCS_TEAMS?.membersOptions(e.target.value,'Equipe')||'<option>Equipe</option>';}
 if(e.target.name==='team'&&e.target.closest('#event-wizard-form')){const list=$('#flow-task-list');if(list)list.innerHTML=checklistRows($('#flow-kind').value);}
 if(e.target.id==='requester-select'){} // Seleção padronizada validada em salvar.
});
document.addEventListener('submit',e=>{
 if(e.target.id==='flow-assign-form'){e.preventDefault();const btn=e.target.querySelector('[type=submit]');btn.disabled=true;submitDelegation(e.target).catch(x=>B().toast('Erro: '+x.message)).finally(()=>{if(btn.isConnected)btn.disabled=false;});return;}
 if(e.target.id==='flow-meeting-form'){e.preventDefault();const btn=e.target.querySelector('[type=submit]');btn.disabled=true;submitMeeting(e.target).catch(x=>B().toast('Erro: '+x.message)).finally(()=>{if(btn.isConnected)btn.disabled=false;});return;}
 if(e.target.id!=='event-wizard-form')return;
 e.preventDefault();if(validate(0)&&validate(1))save();
});
window.DCS_EVENTFLOW={openCreate,extraHtml,meetingHtml,checklistHtml,collect};
})();