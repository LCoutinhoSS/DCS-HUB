/* DCS HUB · Modelos de documentos v0.13.
 * Inspirados nos arquivos ALESP enviados pelo usuário; nenhum arquivo original
 * nem logotipo institucional é distribuído no repositório público.
 * Sem horários ou autoridades inventados: lacunas são marcadas A CONFIRMAR.
 */
(function(){
'use strict';
const clean=s=>String(s??'').trim().replace(/[ \t]+/g,' ').slice(0,1800);
const block=(kind,text)=>({kind,text:clean(text)});
const fmtDate=v=>{try{return new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});}catch{return 'A confirmar';}};
const fmtTime=v=>{try{return new Date(v).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).replace(':','h');}catch{return 'A confirmar';}};
const statuses={confirmed:'Confirmado',invited:'Convidado',declined:'Não comparecerá',to_confirm:'A confirmar'};
const answer=(state,key)=>(state.answers||[]).find(a=>a.question_key===key)||null;
const text=(state,key,fallback='A CONFIRMAR')=>{
 const a=answer(state,key);
 return a?.status==='confirmed'&&a?.answer?.trim()?clean(a.answer):fallback;
};
const statusText=(state,key)=>{
 const a=answer(state,key);
 return a?.status==='confirmed'&&a.answer?.trim()?'Confirmado: '+clean(a.answer):
  a?.status==='not_applicable'?'Não se aplica':
  a?.answer?.trim()?'A CONFIRMAR: '+clean(a.answer):'A CONFIRMAR';
};
const qByKey=(questions,key)=>questions.find(q=>q.key===key)?.title||key.replaceAll('_',' ');
const pending=(state,questions)=>questions.filter(q=>{
 const a=answer(state,q.key);
 return a?.status!=='confirmed'&&a?.status!=='not_applicable';
});
const latestMeeting=(meetings)=>(meetings||[]).filter(m=>m.status!=='cancelada').sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at))[0]||null;
const relevantPeople=state=>(state.participants||[]).filter(p=>p.active!==false&&p.invitation_status!=='declined');
const yes=state=>answer(state,'hino')?.status==='confirmed'&&/^(sim|haverá|execução|banda|confirmado|ok)/i.test(clean(answer(state,'hino')?.answer));
const basic=(ev)=>[
 block('title',clean(ev.t||'EVENTO SEM TÍTULO')),
 block('subtitle','DIVISÃO DE COMUNICAÇÃO SOCIAL — CERIMONIAL'),
 block('meta','DATA: '+fmtDate(ev.d)),
 block('meta','HORÁRIO PREVISTO: '+fmtTime(ev.d)),
 block('meta','LOCAL INFORMADO: '+clean(ev.loc||'A definir')+' (sujeito à reserva institucional)'),
 block('meta','SOLICITANTE: '+clean(ev.requester_name||'A confirmar'))
];
function speakers(people){
 const items=people.filter(p=>['mesa','fala','homenageado','palestrante'].includes(p.participation));
 return items.length?items.map(p=>block('bullet',
  clean(p.full_name)+' — '+clean(p.role_title||'Cargo a confirmar')+
  (p.organization?' — '+clean(p.organization):'')+
  ' ['+(statuses[p.invitation_status]||'A confirmar')+']')):[
  block('note','Composição da mesa e participantes ainda não registrados no evento.')
 ];
}
function summary(ev,state,meetings,tasks,questions){
 const m=latestMeeting(meetings);
 const out=[
  block('title','RESUMO DA REUNIÃO — '+clean(ev.t)),
  block('subtitle','DCS / CERIMONIAL · MINUTA PARA CONFERÊNCIA'),
  block('meta','EVENTO: '+clean(ev.t)),
  block('meta','DATA DO EVENTO: '+fmtDate(ev.d)+' · '+fmtTime(ev.d)),
  block('meta','LOCAL: '+clean(ev.loc||'A confirmar')),
  block('meta','SOLICITANTE: '+clean(ev.requester_name||'A confirmar')),
  block('meta','REUNIÃO: '+(m?fmtDate(m.starts_at)+' · '+fmtTime(m.starts_at):'Não registrada no HUB')),
  block('meta','PARTICIPANTES DA REUNIÃO: '+clean(m?.attendees||'A confirmar')),
  block('heading','1. DIRECIONAMENTOS E DEFINIÇÕES REGISTRADAS')
 ];
 const confirmed=(questions||[]).filter(q=>answer(state,q.key)?.status==='confirmed'&&answer(state,q.key)?.answer?.trim());
 if(confirmed.length){
  for(const q of confirmed)out.push(block('bullet',q.title+': '+clean(answer(state,q.key).answer)));
 }else out.push(block('note','Ainda não há definições confirmadas na Ficha do Gabinete.'));
 out.push(block('heading','2. INFORMAÇÕES PENDENTES COM O GABINETE'));
 const unresolved=pending(state,questions||[]);
 if(unresolved.length)for(const q of unresolved){
  const a=answer(state,q.key);
  out.push(block('bullet',q.title+': '+(a?.answer?.trim()?'INFORMAÇÃO PRELIMINAR — '+clean(a.answer):'A CONFIRMAR')));
 }else out.push(block('text','Nenhuma pendência identificada no modelo de perguntas.'));
 out.push(block('heading','3. PARTICIPANTES, MESA E HOMENAGEADOS'));
 out.push(...speakers(relevantPeople(state)));
 out.push(block('heading','4. REGISTRO DA REUNIÃO PREPARATÓRIA'));
 if(m){
  out.push(block('text','Pauta: '+clean(m.agenda||'Não informada')));
  out.push(block('text','Ata/registro: '+clean(m.minutes||'Ainda não registrado')));
  out.push(block('text','Decisões e encaminhamentos: '+clean(m.decisions||'Ainda não registrados')));
 }else out.push(block('note','Nenhuma reunião preparatória foi registrada no HUB. Não se deve atribuir estas informações a uma reunião ainda não realizada.'));
 out.push(block('heading','5. PROVIDÊNCIAS E RESPONSÁVEIS'));
 const open=(tasks||[]).filter(t=>!['Concluído','Cancelado'].includes(t.s));
 if(open.length)for(const t of open)out.push(block('bullet',clean(t.t)+' — '+clean(t.w||'Sem responsável')+' — Prazo: '+clean(t.due||'A definir')));
 else out.push(block('text','Nenhuma tarefa pendente registrada.'));
 out.push(block('heading','6. PRÓXIMOS PASSOS'));
 out.push(block('text','O Cerimonial e o gabinete devem validar as pendências acima, atualizar o HUB e revisar esta minuta antes de sua utilização institucional.'));
 out.push(block('note','Documento gerado a partir das informações registradas no DCS HUB. Não é ata assinada nem substitui aprovação institucional.'));
 return out;
}
function roteiro(ev,state,meetings,tasks,questions){
 const isSolene=ev.kind==='sessao_solene';
 const out=[
  block('title',(isSolene?'ROTEIRO — SESSÃO SOLENE: ':'ROTEIRO DO EVENTO — ')+clean(ev.t)),
  block('subtitle','DCS / CERIMONIAL · MINUTA PARA CONFERÊNCIA'),
  ...basic(ev).slice(2),
  block('heading','ROTEIRO PRELIMINAR')
 ];
 if(isSolene){
  out.push(block('time','A CONFIRMAR — Recepção dos convidados / welcome coffee, se previsto.'));
  out.push(block('time','A CONFIRMAR — Chegada do deputado proponente e encaminhamento ao espaço.'));
  out.push(block('time',fmtTime(ev.d)+' (início previsto) — Abertura e composição da mesa.'));
  out.push(block('time',yes(state)?'A CONFIRMAR HORÁRIO — Execução do Hino Nacional (informada pelo gabinete).':
   'A CONFIRMAR — Execução do Hino Nacional: '+statusText(state,'hino')+'.'));
  out.push(block('time','A CONFIRMAR — Palavras de abertura do deputado proponente.'));
  out.push(block('time','A CONFIRMAR — Uso da palavra pelas autoridades da mesa.'));
  out.push(block('time','A CONFIRMAR — Vídeos e apresentações: '+statusText(state,'apresentacoes')+'.'));
  out.push(block('time','A CONFIRMAR — Homenagem/entrega: '+statusText(state,'honrarias')+'.'));
  out.push(block('time','A CONFIRMAR — Manifestação dos homenageados, se prevista.'));
  out.push(block('time','A CONFIRMAR — Palavras de encerramento.'));
 }else{
  out.push(block('time',fmtTime(ev.d)+' (início previsto) — Abertura do evento.'));
  const m=latestMeeting(meetings);
  if(m?.agenda)out.push(block('text','Pauta registrada: '+clean(m.agenda)));
  out.push(block('time','A CONFIRMAR — Programação e ordem de fala, conforme alinhamento com o solicitante.'));
  out.push(block('time','A CONFIRMAR — Encerramento.'));
 }
 if(ev.de)out.push(block('note','Término cadastrado na agenda: '+fmtTime(ev.de)+'. Conferir se é apenas duração padrão da reserva.'));
 out.push(block('heading','COMPOSIÇÃO DA MESA E USO DA PALAVRA'));
 out.push(...speakers(relevantPeople(state)));
 out.push(block('heading','INFORMAÇÕES OPERACIONAIS'));
 for(const key of (isSolene?['disposicao_mesa','receptivo','publico','buffet','copa','acessibilidade','sinalizacao']:['publico','apresentacoes','acessibilidade'])){
  const q=(questions||[]).find(x=>x.key===key);
  if(q)out.push(block('bullet',q.title+': '+statusText(state,key)));
 }
 out.push(block('heading','PENDÊNCIAS PARA FECHAMENTO DO ROTEIRO'));
 const p=pending(state,questions||[]);
 if(p.length)for(const q of p.slice(0,20))out.push(block('bullet',q.title+' — A CONFIRMAR'));
 else out.push(block('text','Nenhuma pendência declarada na Ficha do Gabinete.'));
 const m=latestMeeting(meetings);
 if(m?.decisions)out.push(block('heading','ORIENTAÇÕES DA REUNIÃO'),block('text',m.decisions));
 out.push(block('note','Minuta operacional: horários intermediários, precedência e presença de autoridades exigem validação do Cerimonial antes de utilização.'));
 return out;
}
function build(kind,ev,state,meetings,tasks,questions){
 if(!ev||!state)throw Error('Evento e briefing são obrigatórios');
 if(kind==='roteiro')return roteiro(ev,state,meetings,tasks,questions);
 if(kind==='resumo_reuniao')return summary(ev,state,meetings,tasks,questions);
 throw Error('Modelo de documento inválido');
}
window.DCS_MATERIAL_BUILDER={build,fmtDate,fmtTime,pending};
})();