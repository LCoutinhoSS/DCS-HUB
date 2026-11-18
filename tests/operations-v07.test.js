import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/202611180005_venues_teams_editorial.sql');
const venues=read('../src/venues.js');
const teams=read('../src/teams.js');
const notify=read('../src/demo-notifications.js');
const wiki=read('../src/knowledge.js');
const backend=read('../src/backend.js');
const demo=read('../demo.html');
const app=read('../index.html');

test('arquivos de interfaces, equipes e publicações são JavaScript válido',()=>{
 for(const code of [venues,teams,notify,wiki]) assert.doesNotThrow(()=>new Function(code));
 for(const html of [demo,app]) {
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);assert.doesNotThrow(()=>new Function(inline));
 }
});

test('ALESP: catálogo selecionável, preservação de referências e edição somente por admin',()=>{
 assert.match(sql,/create table public\.venues/);
 assert.match(sql,/create unique index venues_name_unique/);
 assert.match(sql,/create policy venue_insert[\s\S]*public\.is_admin/);
 assert.match(sql,/create policy venue_update[\s\S]*public\.is_admin/);
 assert.doesNotMatch(sql,/create policy venue_delete/);
 assert.match(sql,/alter table public\.events add column venue_id uuid/);
 assert.match(sql,/new\.location:=v\.name/);
 assert.match(venues,/Plenário Juscelino Kubitschek/);
 assert.match(venues,/Auditório Franco Montoro/);
 assert.match(venues,/Hall Nobre 23 de Maio/);
 for(const html of [demo,app]){
  assert.match(html,/name="venue_id"/);
  assert.match(html,/selectMarkup\(\)/);
  assert.doesNotMatch(html,/<label>Local<input class="fi" name="l"/);
  assert.match(html,/r==='espacos'/);
 }
});

test('equipes DCS e Cerimonial, filtro de tarefa e pessoas separadas',()=>{
 assert.match(sql,/alter table public\.tasks add column team text/);
 assert.match(sql,/validate_task_team/);
 assert.match(sql,/O responsável deve pertencer à equipe da tarefa/);
 assert.match(teams,/Comunicação Social \(DCS\)/);
 assert.match(teams,/Cerimonial/);
 assert.match(teams,/membersOptions\(team/);
 for(const html of [demo,app]){
  assert.match(html,/name="team"/);
  assert.match(html,/DCS_TEAMS\.taskFormHtml/);
  assert.match(html,/filterHtml\(S\.tg/);
  assert.match(html,/r==='equipes'/);
 }
});

test('avisos reais são por destinatário e são somente internos',()=>{
 assert.match(sql,/create table public\.task_notifications/);
 assert.match(sql,/recipient_id=\(select auth.uid\(\)\)/);
 assert.match(sql,/create trigger notify_task_assignee/);
 assert.match(sql,/grant select,update\(read_at\) on public\.task_notifications/);
 assert.doesNotMatch(sql,/grant insert on public\.task_notifications/);
 assert.match(backend,/async refreshNotifications/);
 assert.match(backend,/async markNotificationsRead/);
 assert.match(backend,/setInterval\(\(\)=>\{if\(profile\?\.active\)/);
 assert.match(notify,/Não envia mensagens para outros computadores/);
});

test('fotografias editoriais: capa, legenda, crédito e armazenamento privado',()=>{
 assert.match(sql,/alter table public\.knowledge_articles add column media jsonb/);
 assert.match(sql,/create policy dcs_editorial_read/);
 assert.match(sql,/a\.status='published'/);
 assert.match(sql,/false,5242880/);
 assert.match(backend,/uploadArticlePhoto/);
 assert.match(backend,/createSignedUrl/);
 assert.match(wiki,/function photoInputs/);
 assert.match(wiki,/function editorialFig/);
 assert.match(wiki,/fileAsImageData/);
 assert.match(wiki,/editorial-reader-hero/);
 assert.match(wiki,/image_caption_/);
 assert.match(wiki,/image_credit_/);
});

test('separação de apresentação e Supabase permanece explícita',()=>{
 assert.match(demo,/demo-auth\.js/);
 assert.match(app,/import\('\.\/src\/backend\.js'\)/);
 assert.match(notify,/sessionStorage/);
 assert.doesNotMatch(venues,/service_role/);
 assert.doesNotMatch(teams,/service_role/);
});
