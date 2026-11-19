import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/202611190010_task_collaboration.sql');
const backend=read('../src/backend.js');
const model=read('../src/model.js');
const ui=read('../src/task-collaboration.js');
const pages=[read('../index.html'),read('../demo.html')];

test('aceite pertence ao responsável ativo e reinicia após reatribuição',()=>{
 assert.match(sql,/add column accepted_at timestamptz/);
 assert.match(sql,/add column accepted_by uuid references public\.profiles/);
 assert.match(sql,/new\.assignee_id is distinct from old\.assignee_id/);
 assert.match(sql,/new\.accepted_at:=null/);
 assert.match(sql,/create function public\.dcs_accept_task/);
 assert.match(sql,/v\.assignee_id is distinct from me/);
 assert.match(sql,/Somente o responsável atual aceita a tarefa/);
 assert.match(sql,/p_task_id uuid/);
 assert.match(backend,/rpc\('dcs_accept_task'/);
 assert.match(model,/acceptedAt:row\.accepted_at\|\|null/);
});

test('comentários são protegidos por RLS com criador, responsável ou gestor',()=>{
 assert.match(sql,/create table public\.task_comments/);
 assert.match(sql,/alter table public\.task_comments enable row level security/);
 assert.match(sql,/create policy dcs_task_comments_read/);
 assert.match(sql,/create policy dcs_task_comments_add/);
 assert.match(sql,/t\.created_by=\(select auth\.uid\(\)\)/);
 assert.match(sql,/t\.assignee_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/author_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/revoke all on public\.task_comments from public,anon,authenticated/);
 assert.match(backend,/async listTaskComments\(/);
 assert.match(backend,/async addTaskComment\(/);
 assert.doesNotMatch(backend,/from\('task_comments'\)\.update/);
});

test('lembrete no HUB é limitado a uma vez por dia e por tarefa, sem acesso anônimo',()=>{
 assert.match(sql,/create unique index task_notifications_daily_reminder_unique/);
 assert.match(sql,/where kind='reminder' and reminder_day is not null/);
 assert.match(sql,/create function public\.dcs_sync_my_reminders/);
 assert.match(sql,/public\.is_member\(\)/);
 assert.match(sql,/on conflict do nothing/);
 assert.match(sql,/America\/Sao_Paulo/);
 assert.match(sql,/t\.status not in \('completed','canceled'\)/);
 assert.match(sql,/revoke all on function public\.dcs_accept_task\(uuid\),[\s\S]*public\.dcs_sync_my_reminders\(\) from public,anon/);
 assert.match(backend,/rpc\('dcs_sync_my_reminders'\)/);
});

test('UI das duas versões exibe aceite, comentários e filtro de atrasos',()=>{
 assert.doesNotThrow(()=>new Function(ui));
 for(const page of pages){
  assert.match(page,/task-collaboration\.js/);
  assert.match(page,/task-collaboration\.css/);
  assert.match(page,/data-task-overdue/);
  assert.match(page,/DCS_TASKS\.cardControls\(t\)/);
 }
 const ctx={window:{DCS_BRIDGE:{S:{role:'Gestor'}}},document:{addEventListener(){}}};
 vm.runInNewContext(ui,ctx);
 const task={id:'abc',t:'Teste',s:'Pendente',dueAt:'2020-01-01',w:'Equipe'};
 assert.equal(ctx.window.DCS_TASKS.isOverdue(task),true);
 assert.equal(ctx.window.DCS_TASKS.isOverdue({...task,s:'Concluído'}),false);
 assert.match(ctx.window.DCS_TASKS.cardControls(task),/Atrasada/);
});

test('as notificações de aceite e conversa só são enviadas aos envolvidos',()=>{
 assert.match(sql,/create trigger dcs_task_acceptance_notice/);
 assert.match(sql,/create trigger dcs_task_comment_notice/);
 assert.match(sql,/new\.created_by is distinct from auth\.uid\(\)/);
 assert.match(sql,/p\.id in \(t\.created_by,t\.assignee_id\)/);
 assert.match(sql,/p\.id is distinct from new\.author_id/);
});
