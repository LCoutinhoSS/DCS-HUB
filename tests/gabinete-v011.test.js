import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=x=>fs.readFileSync(new URL(x,import.meta.url),'utf8');
const model=read('../src/event-briefing.js');
const sql=read('../supabase/migrations/202611190011_gabinete_briefing_participants.sql');
const flow=read('../src/eventflow.js');
const backend=read('../src/backend.js');
const view=read('../index.html');
const demo=read('../demo.html');

function boot(){
 const win={DCS_BRIDGE:{S:{role:'Administrador',route:'eventos',ev:'ev1'},E:[],rr(){},toast(){}},
   DCS_BACKEND:{enabled:false}};
 const doc={addEventListener(){}};
 vm.runInNewContext(model,{window:win,document:doc,console});
 return win;
}
test('perguntas agrupadas respeitam diferenças reais dos cinco checklists ALESP',()=>{
 const w=boot(),sets=['sessao_solene','audiencia_publica','cursos_palestras','recepcao_autoridades','velorio'];
 for(const kind of sets){
  const q=w.DCS_GABINETE.questions(kind);
  assert.ok(q.length>=9,kind);
  assert.equal(new Set(q.map(x=>x.key)).size,q.length,'identificadores únicos por tipo');
  assert.ok(q.every(x=>x.section&&x.title));
 }
 assert.match(model,/Quem compõe a mesa/);
 assert.match(model,/grupos favoráveis e contrários/i);
 assert.match(model,/currículos resumidos/);
 assert.match(model,/órgão, país ou instituição/);
 assert.match(model,/O velório será aberto ao público/);
});
test('ficha e pessoas são seções diferentes e acessíveis em modo demonstrativo',()=>{
 const w=boot(),ev={id:'ev1',kind:'sessao_solene',st:'Pendente',t:'Evento fictício'};
 const a=w.DCS_GABINETE.renderBriefing(ev);
 const p=w.DCS_GABINETE.renderParticipants(ev);
 assert.match(a,/Ficha do Gabinete/);
 assert.match(a,/data-gab-form/);
 assert.match(a,/Somente pendências/);
 assert.match(p,/Participantes e composição da mesa/);
 assert.match(p,/data-person-add/);
 assert.match(p,/Diretório de autoridades/);
});
test('backend guarda respostas, convidados e equipe compartilha somente em perfil autorizado',()=>{
 assert.match(sql,/create table public\.event_briefing_answers/);
 assert.match(sql,/create table public\.event_participants/);
 assert.match(sql,/alter table public\.event_briefing_answers enable row level security/);
 assert.match(sql,/alter table public\.event_participants enable row level security/);
 assert.match(sql,/public\.is_member\(\)/);
 assert.match(sql,/public\.is_editor\(\)/);
 assert.match(sql,/p_status not in/);
 assert.match(sql,/question_key ~/);
 assert.match(sql,/revoke all on public\.event_briefing_answers from public,anon,authenticated/);
 assert.match(sql,/revoke all on public\.event_participants from public,anon,authenticated/);
 assert.match(sql,/event_history/);
 assert.match(backend,/async getEventBriefingData\(/);
 assert.match(backend,/async saveEventBriefingAnswer\(/);
 assert.match(backend,/async createEventParticipant\(/);
 assert.match(backend,/async updateEventParticipant\(/);
 assert.match(backend,/rpc\('dcs_save_event_briefing'/);
});
test('o checklist operacional é filtrável e o formulário de evento não mistura autoridades convidadas',()=>{
 assert.match(flow,/checklistFilter='pending'/);
 assert.match(flow,/data-flow-filter/);
 assert.match(flow,/Ver respostas do gabinete/);
 assert.match(flow,/gab-check-summary/);
 assert.doesNotMatch(flow,/name="guests" maxlength="300"/);
 assert.match(flow,/Pessoas e mesa/);
});
test('as duas páginas carregam as abas e scripts com identificadores persistentes',()=>{
 for(const page of [view,demo]){
  assert.match(page,/event-briefing\.js/);
  assert.match(page,/event-briefing\.css/);
  assert.match(page,/\['gabinete','Ficha do Gabinete'\]/);
  assert.match(page,/\['participantes','Pessoas e mesa'\]/);
  assert.match(page,/\['chk','Execução'\]/);
  assert.match(page,/DCS_GABINETE\.renderBriefing/);
  assert.match(page,/DCS_GABINETE\.renderParticipants/);
  assert.match(page,/Diretório de autoridades/);
 }
});
