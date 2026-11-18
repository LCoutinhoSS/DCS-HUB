import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const checklists=read('../src/checklist-models.js');
const requesters=read('../src/requesters.js');
const flow=read('../src/eventflow.js');
const sql=read('../supabase/migrations/202611180006_requesters_eventflow.sql');
const wiki=read('../src/knowledge.js');
const html=read('../index.html');
const demo=read('../demo.html');

test('modelos seguem cinco checklists reais distintos, com tarefas e etapas',()=>{
 const window={};
 vm.runInNewContext(checklists,{window,console});
 const type=window.DCS_CHECKLISTS;
 const keys=['sessao_solene','velorio','audiencia_publica','cursos_palestras','recepcao_autoridades'];
 const rows=keys.map(k=>type.items(k));
 for(const item of rows)assert.ok(item.length>=20);
 assert.match(rows[0].map(x=>x.title).join('|'),/TRIBUNA DE HONRA/);
 assert.match(rows[1].map(x=>x.title).join('|'),/COROA DE FLORES/);
 assert.match(rows[2].map(x=>x.title).join('|'),/A FAVOR E CONTRA/);
 assert.match(rows[3].map(x=>x.title).join('|'),/CURRÍCULO RESUMIDO/);
 assert.match(rows[4].map(x=>x.title).join('|'),/LÍNGUA ESTRANGEIRA/);
 assert.doesNotMatch(checklists,/Alsrv006|vol1|João Batista Inocentini|Ana Carolina Oliveira/);
});

test('Sessão Solene incorpora a segunda aba operacional e não expõe caminhos de rede',()=>{
 const window={};
 vm.runInNewContext(checklists,{window,console});
 const rows=window.DCS_CHECKLISTS.items('sessao_solene');
 assert.ok(rows.length>=65,'reunião preparatória + planejamento operacional');
 assert.ok(rows.length<=80,'limite transacional do banco');
 assert.ok(rows.some(x=>x.section==='Pré-evento: impressões e materiais'));
 assert.ok(rows.some(x=>x.section==='Execução: receptivo'));
 assert.ok(rows.some(x=>x.section==='Pós-evento'));
 const tasks=rows.map(x=>x.title).join('|');
 assert.match(tasks,/rádios/i);
 assert.match(tasks,/honraria/i);
 assert.match(tasks,/Revisar script com o deputado solicitante/);
 assert.match(tasks,/Reunião de avaliação pós-evento/i);
 assert.doesNotMatch(tasks,/Alsrv006|vol1|RG:\s*\d|CPF:\s*\d/);
});

test('cada etapa pode ter equipe, responsável e prazo próprios',()=>{
 const window={DCS_BRIDGE:{S:{in:0},toast(){}},DCS_REQUESTERS:{get:()=>({id:'r1',name:'Deputado Teste',active:true})},
  DCS_VENUES:{get:()=>({id:'v1',name:'Plenário JK',active:true})},
  DCS_TEAMS:{normalizeAssignee:x=>x,list:()=>[{label:'Bruno L.',active:true,department:'Cerimonial'},{label:'Camila A.',active:true,department:'DCS'}]}};
 const listeners=[];
 const form={map:{kind:'reuniao',t:'Reunião de alinhamento',requester_id:'r1',venue_id:'v1',team:'DCS',
  d:'2026-11-20',h:'10:00',e:'2026-11-20',end_h:'11:30',
  'team_reuniao-1':'Cerimonial','who_reuniao-1':'Bruno L.','inc_reuniao-1':'on','due_reuniao-1':'2026-11-19',
  'team_reuniao-2':'DCS','who_reuniao-2':'Camila A.','inc_reuniao-2':'on'}};
 const document={querySelector:q=>q==='#event-wizard-form'?form:null,addEventListener:(type,cb)=>listeners.push([type,cb])};
 const FormData=class{constructor(f){this.map=f.map;}get(k){return this.map[k]??null;}};
 vm.runInNewContext(checklists,{window,console});
 vm.runInNewContext(flow,{window,document,FormData,Date,location:{hash:''},console});
 const event=window.DCS_EVENTFLOW.collect();
 const a=event.tasks.find(x=>x.title.includes('DEFINIR OBJETIVO'));
 const b=event.tasks.find(x=>x.title.includes('CONFIRMAR PARTICIPANTES'));
 assert.equal(a.team,'Cerimonial');assert.equal(a.assignee_label,'Bruno L.');
 assert.equal(a.due_at,'2026-11-19');assert.equal(a.applicable,true);
 assert.equal(b.team,'DCS');assert.equal(b.assignee_label,'Camila A.');
 assert.match(flow,/data-flow-item-team/);
 assert.match(flow,/flow-checklist-group/);
 assert.match(flow,/<details/);
});

test('catálogo inicial tem exatamente 94 deputados em exercício e permite outros tipos',async()=>{
 const window={};
 const doc={addEventListener(){}};
 vm.runInNewContext(requesters,{window,document:doc,console,Date});
 assert.equal(window.DCS_REQUESTERS.deputyCount,94);
 const records=await window.DCS_REQUESTERS.load();
 assert.equal(records.length,94);
 assert.equal(new Set(records.map(x=>x.name)).size,94);
 assert.ok(records.some(x=>x.name==='MAURICI'));
 assert.ok(records.some(x=>x.name==='AGENTE FEDERAL DANILO BALAS'));
 assert.match(requesters,/kind==='setor'/);
 assert.match(requesters,/Cadastro administrativo/);
});

test('fluxo de eventos dá contexto, solicitante, reunião, tarefas e responsáveis',()=>{
 assert.doesNotThrow(()=>new Function(flow));
 assert.match(flow,/id="event-wizard-form"/);
 assert.match(flow,/requester_id/);
 assert.match(flow,/meeting_format/);
 assert.match(flow,/minutes_owner/);
 assert.match(flow,/decisions/);
 assert.match(flow,/assignee_label/);
 assert.match(flow,/data-flow-delegate/);
 assert.match(flow,/delegateChecklistItem/);
 assert.match(flow,/updateMeetingBriefing/);
 assert.match(flow,/A criação deixa o evento PENDENTE/);
});

test('a matéria tem rota própria, não utiliza pop-up para leitura',()=>{
 assert.match(html,/h\.startsWith\('materia\/'\)/);
 assert.match(wiki,/location\.hash='materia\/'/);
 assert.match(wiki,/async function renderArticlePage/);
 assert.match(wiki,/article-page-hero/);
 assert.match(wiki,/article-page-related/);
 assert.match(wiki,/renderArticlePage,eventDocsHtml/);
 assert.doesNotMatch(wiki,/function showArticle\(id\)\{[\s\S]{0,110}modal\(/);
});

test('backend valida solicitantes e usa criação transacional do evento',()=>{
 assert.match(sql,/create table public\.event_requesters/);
 assert.match(sql,/create policy requesters_insert[\s\S]*public\.is_admin/);
 assert.match(sql,/requester_name_snapshot/);
 assert.match(sql,/create function public\.create_planned_event/);
 assert.match(sql,/if \(select auth\.uid\(\)\) is null/);
 assert.match(sql,/jsonb_array_length\(p_items\)>80/);
 assert.match(sql,/alter column template_item_id drop not null/);
 assert.match(sql,/where ec\.event_id=p_event_id and ec\.applicable and not ec\.completed and ec\.assignee_id is not null/);
 assert.match(sql,/create function public\.delegate_event_checklist/);
 assert.match(sql,/grant execute on function public\.delegate_event_checklist/);
 assert.match(sql,/enable row level security/);
});

test('modos de demonstração e scripts são sincronizados',()=>{
 for(const page of [html,demo]){
  for(const file of ['requesters.js','checklist-models.js','eventflow.js','eventflow.css'])assert.ok(page.includes(file),file);
  assert.match(page,/DCS_EVENTFLOW\.openCreate/);
  assert.match(page,/DCS_KNOWLEDGE\.renderArticlePage/);
  assert.match(page,/generateDemoTasks:gen/);
 }
});
