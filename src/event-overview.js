/* DCS HUB v0.12 — Visão rápida de evento, somente leitura.
 * Inspirada no Resumo de Reunião e nos modelos de Roteiro/Nominatas/Prismas ALESP.
 * Nunca supõe presença confirmada, sala reservada ou documento produzido.
 */
(function(){
'use strict';
const B=()=>window.DCS_BRIDGE;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const friendly={confirmed:'Confirmado',to_confirm:'A confirmar',pending:'Não informado',not_applicable:'Não se aplica'};
const priorities={
 sessao_solene:['mesa','publico','hino','honrarias','receptivo','apresentacoes','disposicao_mesa','buffet','cerimonial_mestre','acessibilidade'],
 audiencia_publica:['mesa','grupos','falas','inscricoes','horario_inscricao','publico','apresentacoes'],
 cursos_palestras:['palestrantes','mesa','curriculos','falas','publico','apresentacoes'],
 recepcao_autoridades:['visitantes','origem','idioma','protocolo','recepcao','percurso'],
 velorio:['familia','funeraria','publico','autoridades','imprensa','isolamento'],
 reuniao:['pauta','participantes','recursos'],
 exposicao:['objetivo','montagem','responsavel'],
 visita_guiada:['grupo','roteiro','acessibilidade'],
 comunicacao_visual:['material','referencias','aprovacao']
};
const templates=[
 ['Roteiro','Gerar, revisar com o Cerimonial e exportar o Word editável','materiais'],
 ['Resumo da reunião','Consolidar decisões e pendências em Word revisado','materiais'],
 ['Nominatas','Preparar saudações e identificações em Word revisado','materiais'],
 ['Prismas','Gerar PowerPoint editável com dois lados para dobrar','materiais']
];
const byStatus=(a,k)=>a.find(x=>x.question_key===k);
const asStatus=s=>friendly[s]||'Não informado';
const validMeeting=m=>m&&m.status!=='cancelada';
const compact=s=>String(s||'').trim().replace(/\s+/g,' ');
const fmt=(d,opts)=>{try{return new Date(d).toLocaleString('pt-BR',opts||{dateStyle:'short',timeStyle:'short'});}catch(_){return 'A confirmar';}};
const section=(title,body,actions='')=>'<section class="sum-section"><div class="sum-section-head"><h3>'+esc(title)+'</h3>'+actions+'</div>'+body+'</section>';
const button=(tab,label,variation='')=>'<button class="btn '+variation+'" data-sum-tab="'+tab+'" type="button">'+esc(label)+'</button>';
function getState(ev){
 const mod=window.DCS_GABINETE;
 let data=mod?.getData?.(ev.id);
 if(!data&&mod?.ensure)mod.ensure(ev.id).catch(e=>console.warn('[DCS HUB] Resumo:',e));
 return data||null;
}
function details(ev){
 const state=getState(ev);
 if(!state)return {loading:true,answers:[],people:[]};
 if(state.error)return {error:state.error,answers:[],people:[]};
 const answers=state.answers||[],people=(state.participants||[]).filter(p=>p.active!==false);
 const questions=window.DCS_GABINETE?.questions(ev.kind)||[];
 const keyOrder=priorities[ev.kind]||questions.map(x=>x.key);
 const relevant=keyOrder.map(k=>questions.find(q=>q.key===k)).filter(Boolean);
 const done=questions.filter(q=>['confirmed','not_applicable'].includes(byStatus(answers,q.key)?.status)).length;
 const confirmed=questions.filter(q=>byStatus(answers,q.key)?.status==='confirmed').length;
 const unresolved=questions.filter(q=>!['confirmed','not_applicable'].includes(byStatus(answers,q.key)?.status)).length;
 const open=relevant.filter(q=>!['confirmed','not_applicable'].includes(byStatus(answers,q.key)?.status));
 const decided=relevant.filter(q=>byStatus(answers,q.key)?.status==='confirmed'&&compact(byStatus(answers,q.key)?.answer));
 const alltasks=(B()?.T||[]).filter(t=>t.eid===ev.id&&t.s!=='Cancelado');
 const pendingTasks=alltasks.filter(t=>t.s!=='Concluído');
 const overdue=pendingTasks.filter(t=>window.DCS_TASKS?.isOverdue(t));
 const meeting=(window.DCS_MEETINGS?.eventMeetings?.(ev.id)||[]).find(validMeeting);
 const checks=(ev.chk||[]).filter(x=>x.applicable!==false);
 const checksDone=checks.filter(x=>x.d).length;
 return {answers,people,questions,relevant,done,confirmed,unresolved,open,decided,alltasks,pendingTasks,overdue,meeting,checks,checksDone};
}
function header(ev,s){
 const type=window.DCS_CHECKLISTS?.find?.(ev.kind)?.[1]||'Atividade institucional';
 const date=ev.d instanceof Date?fmt(ev.d,{dateStyle:'full',timeStyle:'short'}):fmt(ev.d);
 const result='<div class="sum-metric"><b>'+s.confirmed+'</b><small>Definições confirmadas</small></div>'+
 '<div class="sum-metric'+(s.unresolved?' sum-metric-alert':'')+'"><b>'+s.unresolved+'</b><small>Informações a definir</small></div>'+
 '<div class="sum-metric"><b>'+s.people.filter(p=>p.invitation_status==='confirmed').length+'</b><small>Presenças confirmadas</small></div>'+
 '<div class="sum-metric"><b>'+s.checksDone+'/'+s.checks.length+'</b><small>Etapas concluídas</small></div>';
 return '<div class="sum-header">'+
 '<div class="sum-head-top"><div><span class="hub-kicker">Resumo operacional · '+esc(type)+'</span><h2>O essencial para a equipe</h2>'+
 '<p>Dados reais do evento e respostas já registradas. O que não foi confirmado aparece como pendência, sem suposições.</p></div>'+
 '<div class="hub-actions"><button class="btn" data-sum-refresh="'+esc(ev.id)+'">Atualizar</button>'+
 '<button class="btn" data-sum-copy="'+esc(ev.id)+'">Copiar resumo</button></div></div>'+
 '<div class="sum-facts">'+
 '<div><small>Solicitante</small><strong>'+esc(ev.requester_name||'Não informado')+'</strong></div>'+
 '<div><small>Data e hora</small><strong>'+esc(date)+'</strong></div>'+
 '<div><small>Local informado</small><strong>'+esc(ev.loc||'A definir')+'</strong><small>Cadastro não equivale à reserva</small></div>'+
 '<div><small>Responsável / equipe</small><strong>'+esc((ev.who||[]).join(', ')||ev.team||'A definir')+'</strong></div>'+
 '</div><div class="sum-metrics">'+result+'</div></div>';
}
function resolvedCard(q,a){
 return '<article class="sum-answer"><span class="sum-done-marker">✓</span><div><b>'+esc(q.title)+'</b><p>'+esc(a.answer)+'</p>'+
 '<small>Confirmado '+(a.updated_at?'· '+esc(fmt(a.updated_at)):'')+'</small></div></article>';
}
function answersSection(ev,s){
 let entries=s.decided.slice(0,6).map(q=>resolvedCard(q,byStatus(s.answers,q.key)));
 if(!entries.length)entries=['<div class="sum-empty">Ainda não há respostas confirmadas pelo gabinete. As definições serão exibidas aqui assim que forem registradas.</div>'];
 const legacy=ev.briefing?.audience?'<p class="sum-subtle">Estimativa informada na criação: '+esc(ev.briefing.audience)+' pessoas (ainda não validada na ficha).</p>':'';
 return section('O que já está definido','<div class="sum-confirmed-list">'+entries.join('')+'</div>'+legacy,
 button('gabinete','Ver todas as respostas'));
}
function pendingSection(s){
 const all=s.open.slice(0,6);
 const body='<div class="sum-pending-list">'+(all.length?all.map(q=>{
  const a=byStatus(s.answers,q.key);
  const status=a?.status==='to_confirm'?'A confirmar':'Sem resposta';
  return '<div class="sum-pending-item"><span class="sum-pending-dot"></span><div><b>'+esc(q.title)+'</b>'+
   '<small>'+esc(status)+(a?.answer?' · '+esc(compact(a.answer).slice(0,125)):'')+'</small></div></div>';
 }).join(''):'<div class="sum-empty">As informações prioritárias estão confirmadas ou não se aplicam.</div>')+'</div>'+
 (s.open.length>all.length?'<p class="sum-subtle">Mais '+(s.open.length-all.length)+' perguntas prioritárias aguardam definição.</p>':'')+
 '<p class="sum-subtle">Total da ficha: '+s.unresolved+' perguntas sem confirmação definitiva.</p>';
 return section('O que falta esclarecer com o gabinete',body,button('gabinete','Resolver pendências','pri'));
}
function peopleSection(s){
 const people=s.people.filter(p=>p.participation==='mesa'||p.participation==='homenageado'||p.participation==='palestrante').slice(0,5);
 const show=people.length?people.map(p=>'<div class="sum-person"><div><b>'+esc(p.full_name)+'</b><small>'+esc([p.role_title,p.organization].filter(Boolean).join(' · ')||'Cargo a confirmar')+'</small></div>'+
 '<span class="gab-status gab-status-'+esc(p.invitation_status)+'">'+esc(({confirmed:'Confirmado',invited:'Convidado',to_confirm:'A confirmar',declined:'Não comparecerá'})[p.invitation_status]||'A confirmar')+'</span></div>').join(''):
 '<div class="sum-empty">A composição da mesa e os participantes principais ainda não foram registrados.</div>';
 const confirmed=s.people.filter(p=>p.invitation_status==='confirmed').length;
 return section('Mesa, homenageados e participantes','<div class="sum-person-list">'+show+'</div>'+
 '<p class="sum-subtle">'+s.people.length+' pessoas cadastradas · '+confirmed+' confirmadas</p>',button('participantes','Ver pessoas e mesa'));
}
function meetingSection(s){
 const m=s.meeting;
 const body=m?'<div class="sum-meeting"><b>'+esc(m.title)+'</b><small>'+esc(fmt(m.starts_at))+' · '+esc(({agendada:'Agendada',realizada:'Realizada',cancelada:'Cancelada'})[m.status]||m.status)+'</small>'+
 '<h4>O que foi decidido</h4><p>'+esc(compact(m.decisions||'Ainda não foram registradas decisões.'))+'</p>'+
 '<h4>Assuntos tratados</h4><p>'+esc(compact(m.agenda||'Pauta ainda não informada.'))+'</p></div>':
 '<div class="sum-empty">Ainda não há reunião preparatória registrada neste evento. Quando houver pauta, ata e decisões, aparecerão resumidas aqui.</div>';
 return section('Reunião preparatória mais recente',body,button('preps','Abrir reuniões'));
}
function tasksSection(s){
 const list=[...s.overdue,...s.pendingTasks.filter(x=>!s.overdue.includes(x))].slice(0,5);
 const body='<div class="sum-tasks">'+(list.length?list.map(t=>
 '<div class="sum-task"><span class="'+(s.overdue.includes(t)?'sum-task-late':'sum-task-status')+'">'+(s.overdue.includes(t)?'Atrasada':esc(t.s||'Pendente'))+'</span>'+
 '<div><b>'+esc(t.t)+'</b><small>'+esc(t.w||'Sem responsável')+' · '+esc(t.due||'Sem prazo')+'</small></div></div>').join(''):
 '<div class="sum-empty">Nenhuma tarefa pendente foi encontrada. Tarefas do modelo são distribuídas após a confirmação do evento.</div>')+'</div>';
 return section('Providências da equipe',body+
 '<p class="sum-subtle">'+s.pendingTasks.length+' tarefas pendentes · '+s.overdue.length+' atrasadas · '+s.checksDone+'/'+s.checks.length+' etapas concluídas.</p>',
 button('chk','Checklist de execução'));
}
function materialsSection(){
 const body='<div class="sum-material-list">'+templates.map(([name,desc,tab])=>
 '<div class="sum-material"><div><strong>'+esc(name)+'</strong><small>'+esc(desc)+'</small></div>'+button(tab,tab==='materiais'?'Preparar Word':'Consultar dados')+'</div>').join('')+'</div>'+
 '<p class="sum-subtle">Os arquivos-modelo fornecidos são referências, não cópias publicadas no HUB. Roteiro, Resumo, Nominata e Prismas podem ser preparados na aba Materiais. A ordem da mesa deve ser definida e revisada pelo Cerimonial.</p>';
 return section('Materiais de trabalho',body);
}
function render(ev){
 const s=details(ev);
 if(s.loading)return '<section class="sum-loading">Preparando visão rápida com as respostas compartilhadas…</section>';
 if(s.error)return '<section class="sum-loading">Não foi possível consultar a ficha: '+esc(s.error)+
 ' <button class="btn" data-sum-refresh="'+esc(ev.id)+'">Tentar novamente</button></section>';
 return '<div class="sum-shell">'+(window.DCS_BACKEND?.enabled?'':'<div class="sum-demo-note">Prévia demonstrativa · informações fictícias</div>')+
 header(ev,s)+'<div class="sum-grid"><div class="sum-main">'+answersSection(ev,s)+pendingSection(s)+meetingSection(s)+'</div>'+
 '<div class="sum-aside">'+peopleSection(s)+tasksSection(s)+materialsSection()+'</div></div></div>';
}
function summaryText(ev){
 const s=details(ev);
 const lines=[
 'RESUMO OPERACIONAL — '+ev.t,
 'Status: '+ev.st,
 'Solicitante: '+(ev.requester_name||'A definir'),
 'Data: '+fmt(ev.d),
 'Local: '+(ev.loc||'A definir')+' (não equivale à reserva)',
 '',
 'INFORMAÇÕES CONFIRMADAS'
 ];
 if(s.loading||s.error)return lines.join('\n')+'\nFicha ainda não carregada.';
 lines.push(...(s.decided.length?s.decided.map(q=>'- '+q.title+': '+byStatus(s.answers,q.key).answer):['- Nenhuma informação confirmada']));
 lines.push('','PENDÊNCIAS COM O GABINETE');
 lines.push(...(s.open.length?s.open.map(q=>'- '+q.title):['- Nenhuma pendência prioritária']));
 lines.push('','PESSOAS E MESA');
 lines.push(...(s.people.length?s.people.map(p=>'- '+p.full_name+' · '+(p.role_title||'Cargo a confirmar')+' · '+p.participation+' · '+p.invitation_status):['- Ainda não cadastradas']));
 lines.push('','PROVIDÊNCIAS');
 lines.push(...(s.pendingTasks.length?s.pendingTasks.map(t=>'- '+t.t+' · '+t.w+' · '+t.due):['- Nenhuma tarefa pendente']));
 if(s.meeting)lines.push('','ÚLTIMA REUNIÃO: '+s.meeting.title,'Decisões: '+(s.meeting.decisions||'A registrar'));
 lines.push('','DCS HUB — resumo consultivo. Informações sujeitas a confirmação.');
 return lines.join('\n');
}
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-sum-tab]');
 if(tab){B().S.tb=tab.dataset.sumTab;B().rr();return;}
 const refresh=e.target.closest('[data-sum-refresh]');
 if(refresh){
  const id=refresh.dataset.sumRefresh;
  refresh.disabled=true;
  Promise.all([window.DCS_GABINETE?.ensure(id,true),window.DCS_BACKEND?.enabled?window.DCS_BACKEND.refreshMeetings():Promise.resolve()])
   .then(()=>{if(B()?.S?.ev===id)B().rr();B()?.toast('Resumo atualizado')})
   .catch(err=>B()?.toast('Erro ao atualizar: '+err.message))
   .finally(()=>{if(refresh.isConnected)refresh.disabled=false;});
 }
 const copy=e.target.closest('[data-sum-copy]');
 if(copy){
  const ev=B()?.E?.find(x=>x.id===copy.dataset.sumCopy);if(!ev)return;
  if(!navigator.clipboard?.writeText){B().toast('Cópia indisponível neste navegador');return;}
  navigator.clipboard.writeText(summaryText(ev)).then(()=>B().toast('Resumo copiado'))
   .catch(()=>B().toast('Não foi possível copiar. Verifique a permissão do navegador.'));
 }
});
window.DCS_EVENT_OVERVIEW={render,summaryText};
if(B()?.S?.in&&B()?.S?.route==='eventos'&&B()?.S?.ev&&B()?.S?.tb==='geral'){
 Promise.resolve().then(()=>B()?.rr());
}
})();