// Funções puras: compartilhadas entre integração e testes.
export const ROLE_LABEL = Object.freeze({admin:'Administrador',manager:'Gestor',dcs:'Servidor DCS',ceremonial:'Servidor Cerimonial',reader:'Leitor'});
export const EVENT_STATUS_LABEL = Object.freeze({pending:'Pendente',confirmed:'Confirmado',awaiting_approval:'Aguardando aprovação',completed:'Concluído',canceled:'Cancelado'});
export const TASK_STATUS_LABEL = Object.freeze({pending:'Pendente',in_progress:'Em andamento',awaiting_approval:'Aguardando aprovação',completed:'Concluído',canceled:'Cancelado'});
export const TASK_STATUS_CODE = Object.fromEntries(Object.entries(TASK_STATUS_LABEL).map(([k,v])=>[v,k]));
export const PRIORITY_LABEL = Object.freeze({high:'Alta',medium:'Média',low:'Baixa'});
export const PRIORITY_CODE = Object.fromEntries(Object.entries(PRIORITY_LABEL).map(([k,v])=>[v,k]));
export const EVENT_STATUS_CODE = Object.fromEntries(Object.entries(EVENT_STATUS_LABEL).map(([k,v])=>[v,k]));

export function localDatetime(day,time) {
  const [year,month,date] = day.split('-').map(Number);
  const [hour,minute] = time.split(':').map(Number);
  if (![year,month,date,hour,minute].every(Number.isFinite)) throw new Error('Data/hora inválida');
  const result = new Date(year,month-1,date,hour,minute);
  if (result.getFullYear()!==year||result.getMonth()!==month-1||result.getDate()!==date||result.getHours()!==hour||result.getMinutes()!==minute) throw new Error('Data/hora inexistente');
  return result;
}

// Exposição de vários dias: termina às 18h do último dia, de forma inclusiva na agenda.
export function eventPeriod(day,time,endDay) {
  const start=localDatetime(day,time);
  let end;
  if (!endDay || endDay===day) end = new Date(start.getTime()+60*60*1000);
  else end = localDatetime(endDay,'18:00');
  if (end<=start) throw new Error('Término deve ser posterior ao início');
  return {start_at:start.toISOString(),end_at:end.toISOString()};
}

export function isVisibleOnDate(event,day) {
  const d=new Date(day.getFullYear(),day.getMonth(),day.getDate());
  const a=new Date(event.start_at),z=new Date(event.end_at);
  const x=new Date(a.getFullYear(),a.getMonth(),a.getDate());
  const y=new Date(z.getFullYear(),z.getMonth(),z.getDate());
  return d>=x && d<=y;
}

export function toUiEvent(row,checklist,history,labelFor) {
  return {
    id:row.id,t:row.title,c:row.category,createdBy:row.created_by,updatedAt:row.updated_at,d:new Date(row.start_at),de:new Date(row.end_at),
    loc:row.location||'A definir',who:[labelFor(row.owner_id)],st:EVENT_STATUS_LABEL[row.status]||row.status,
    kind:row.event_kind||null,requester_id:row.requester_id||null,requester_name:row.requester_name_snapshot||'',team:row.team||'DCS',briefing:row.briefing||{},
    chk:checklist.filter(c=>c.event_id===row.id).sort((a,b)=>a.position-b.position)
      .map(c=>({id:c.id,x:c.label,d:c.completed,section:c.phase||'Etapas',applicable:c.applicable!==false,assignee_label:labelFor(c.assignee_id),team:c.team||'DCS',due_at:c.due_at||null,priority:c.priority||'medium'})),
    hist:history.filter(h=>h.event_id===row.id)
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(describeHistory)
  };
}
export function toUiTask(row,eventById,labelFor) {
  const name=eventById.get(row.event_id)?.title||'Avulsa';
  const date=row.due_at ? row.due_at.split('-').reverse().join('/') : 'Sem prazo';
  return {id:row.id,t:row.title,eid:row.event_id,ev:name.split(' — ')[0],due:date,
    pri:PRIORITY_LABEL[row.priority]||'Média',s:TASK_STATUS_LABEL[row.status]||'Pendente',
    w:labelFor(row.assignee_id),team:row.team||'DCS',meeting_id:row.meeting_id||null,createdBy:row.created_by,assigneeId:row.assignee_id||null,description:row.description||'',dueAt:row.due_at||null,acceptedAt:row.accepted_at||null,acceptedBy:row.accepted_by||null,done:row.status==='completed'?1:0,
    k:row.source_checklist_id ? 'modelo:'+row.source_checklist_id : undefined};
}
export function describeHistory(row) {
  const details=row.details||{};
  switch(row.action) {
    case 'event_created':return 'Atividade criada';
    case 'event_status':return `Status alterado: ${EVENT_STATUS_LABEL[details.from]||details.from} → ${EVENT_STATUS_LABEL[details.to]||details.to}`;
    case 'event_rescheduled':return 'Data ou horário reagendado';
    case 'reschedule_reason':return `Motivo do reagendamento: ${details.reason||'não informado'}`;
    case 'briefing_answer_saved':return `Resposta do gabinete atualizada (${details.question_key||'pergunta'})`;
    case 'event_participant_updated':return 'Lista de pessoas e mesa atualizada';
    case 'mesa_reordered':return 'Ordem da mesa reorganizada pelo Cerimonial';
    case 'meeting_created':return `Reunião preparada: ${details.title||''}`;
    case 'meeting_updated':return `Reunião atualizada: ${details.title||''}`;
    case 'task_created':return `Tarefa criada: ${details.title||''}`;
    case 'task_status':return `Tarefa atualizada: ${details.title||''}`;
    case 'event_updated':return 'Informações do evento alteradas';
    default:return row.action.replace(/_/g,' ');
  }
}
