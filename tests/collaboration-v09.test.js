import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const schema=read('../supabase/migrations/202611190009_collaboration_meetings_tasks.sql');
const backend=read('../src/backend.js');
const model=read('../src/model.js');
const meetings=read('../src/meetings.js');
const index=read('../index.html'),demo=read('../demo.html');

test('reuniões pertencem a evento e só usuários ativos podem consultá-las',()=>{
 assert.match(schema,/create table public\.event_meetings/);
 assert.match(schema,/event_id uuid not null references public\.events/);
 assert.match(schema,/create policy dcs_meeting_read[\s\S]*public\.is_member/);
 assert.match(schema,/create policy dcs_meeting_insert[\s\S]*created_by=\(select auth\.uid\(\)\)/);
 assert.match(schema,/Não é permitido mudar o evento nem o autor da reunião/);
 assert.match(schema,/create trigger dcs_meeting_history/);
 assert.match(schema,/meeting_id uuid references public\.event_meetings/);
 assert.match(schema,/A tarefa deve pertencer ao mesmo evento da reunião/);
});

test('tarefas e checklist são atualizados somente por RPC com autorização explícita',()=>{
 assert.match(schema,/revoke update on public\.tasks from authenticated/);
 assert.match(schema,/revoke update on public\.event_checklist from authenticated/);
 assert.match(schema,/create function public\.dcs_set_task_status/);
 assert.match(schema,/v\.created_by=me or v\.assignee_id=me/);
 assert.match(schema,/create function public\.dcs_assign_task/);
 assert.match(schema,/Somente criador ou gestor distribui tarefas/);
 assert.match(schema,/create function public\.dcs_set_checklist_complete/);
 assert.match(schema,/Etapa não atribuída a esta pessoa/);
 assert.match(backend,/rpc\('dcs_set_task_status'/);
 assert.match(backend,/rpc\('dcs_assign_task'/);
 assert.match(backend,/rpc\('dcs_set_checklist_complete'/);
 assert.doesNotMatch(backend,/from\('tasks'\)\.update\(/);
 assert.doesNotMatch(backend,/from\('event_checklist'\)\.update\(/);
});

test('notificação informa andamento ao criador e pode abrir a tarefa',()=>{
 assert.match(schema,/create trigger dcs_task_status_notification/);
 assert.match(schema,/new\.created_by is distinct from me/);
 assert.match(backend,/task_id:n\.task_id/);
 for(const page of [index,demo]){
  assert.match(page,/data-notif-task/);
  assert.match(page,/data-task-mine/);
  assert.match(page,/data-task-card/);
  assert.match(page,/task-focus/);
 }
});

test('reunião tem pauta, ata, decisões e botão para tarefa de encaminhamento',()=>{
 assert.doesNotThrow(()=>new Function(meetings));
 assert.match(meetings,/function renderEvent/);
 assert.match(meetings,/name="agenda"/);
 assert.match(meetings,/name="minutes"/);
 assert.match(meetings,/name="decisions"/);
 assert.match(meetings,/data-meeting-task/);
 assert.match(meetings,/B\(\)\.openNt\(m\.event_id,m\.id\)/);
 assert.match(backend,/async createMeeting\(/);
 assert.match(backend,/async updateMeeting\(/);
 assert.match(backend,/meeting_id:form\.get\('meeting_id'\)\|\|null/);
 assert.match(model,/meeting_id:row\.meeting_id\|\|null/);
 for(const page of [index,demo]){
  assert.match(page,/meetings\.js/);
  assert.match(page,/meetings\.css/);
  assert.match(page,/\['preps','Reuniões'\]/);
  assert.match(page,/DCS_MEETINGS\.renderEvent/);
  assert.match(page,/openEv,openNt,closeOv/);
 }
});

test('renderização de reuniões é estável quando não existem reuniões',()=>{
 const window={DCS_BRIDGE:{S:{role:'Gestor'},T:[]}};
 const document={addEventListener(){}};
 vm.runInNewContext(meetings,{window,document,console});
 const html=window.DCS_MEETINGS.renderEvent({id:'demo-ev',t:'Teste'});
 assert.match(html,/Sem reuniões preparatórias/);
 assert.match(html,/Agendar reunião/);
});
