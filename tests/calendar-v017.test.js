import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function setup(role='Servidor Cerimonial'){
 const events={},bridge={S:{route:'eventos',ev:'event-1',tb:'cal',role,in:1},E:[],rr(){},toast(){}};
 const win={DCS_BRIDGE:bridge,DCS_CALENDAR:{
  eligible:ev=>['Confirmado','Concluído'].includes(ev.st),
  dates:ev=>({start:new Date(ev.d),end:new Date(ev.de)}),
  renderEvent:()=>'<section>Exportação .ics</section>'
 }};
 const context={window:win,document:{addEventListener:(k,fn)=>{events[k]=fn;}},Date,Intl};
 vm.runInNewContext(read('../src/calendar-manual.js'),context);
 return {api:win.DCS_CALENDAR_MANUAL,calendar:win.DCS_CALENDAR,events,bridge};
}
const event=(st='Confirmado')=>({
 id:'event-1',t:'Sessão Solene — Exemplo',st,
 d:new Date('2026-12-01T22:00:00Z'),de:new Date('2026-12-02T00:00:00Z'),
 loc:'Plenário JK'
});
test('sem declaração o status é não registrado e há confirmação explícita',()=>{
 const {api,calendar}=setup(),ev=event();
 assert.equal(api.statusOf(ev),'unrecorded');
 assert.match(calendar.renderEvent(ev),/Confirmo que importei ou atualizei/);
 assert.match(calendar.renderEvent(ev),/data-calendar-mark/);
 assert.match(calendar.renderEvent(ev),/disabled/);
});
test('declaração de importação corresponde à versão do evento e detecta mudanças',()=>{
 const {api}=setup(),ev=event(),snap=api.snapshot(ev);
 assert.equal(snap.starts_ms,1796162400000);
 api.setData([{event_id:ev.id,calendar_label:'Agenda DCS',imported_at:'2026-11-19T16:00:00Z',actor_label:'Equipe',snapshot:snap}]);
 assert.equal(api.statusOf(ev),'recorded');
 assert.equal(api.stale({...ev,loc:'Novo local'}, {snapshot:snap}),true);
 assert.equal(api.statusOf({...ev,d:new Date('2026-12-01T23:00:00Z')}),'outdated');
 assert.equal(api.statusOf({...ev,st:'Cancelado'}),'cancelled');
});
test('leitores consultam, mas não registram nem apagam declarações',()=>{
 const {calendar,api}=setup('Leitor'),ev=event();
 api.setData([{event_id:ev.id,calendar_label:'',snapshot:api.snapshot(ev),imported_at:'2026-11-19T16:00:00Z'}]);
 const ui=calendar.renderEvent(ev);
 assert.match(ui,/Importação manual declarada/);
 assert.doesNotMatch(ui,/data-calendar-mark=/);
 assert.doesNotMatch(ui,/data-calendar-clear=/);
});
test('SQL mantém RLS, identidade autenticada e impede marcar evento pendente',()=>{
 const sql=read('../supabase/migrations/202611190017_calendar_manual_imports.sql');
 assert.match(sql,/alter table public\.event_calendar_imports enable row level security/);
 assert.match(sql,/create policy event_calendar_imports_read/);
 assert.match(sql,/me uuid := auth\.uid\(\)/);
 assert.match(sql,/not public\.is_editor\(\)/);
 assert.match(sql,/ev\.status not in \('confirmed', 'completed'\)/);
 assert.match(sql,/p_expected is distinct from current_snapshot/);
 assert.match(sql,/calendar_manual_import_recorded/);
 assert.match(sql,/calendar_manual_import_cleared/);
 assert.match(sql,/revoke all on public\.event_calendar_imports/);
 assert.match(sql,/revoke all on function public\.dcs_set_calendar_manual_import/);
 assert.doesNotMatch(sql,/alter table public\.autoridades/);
});
test('frontend e backend vinculados nas duas versões do site',()=>{
 const backend=read('../src/backend.js');
 assert.match(backend,/async listCalendarImports/);
 assert.match(backend,/async setCalendarManualImport/);
 assert.match(backend,/dcs_set_calendar_manual_import/);
 for(const file of ['../index.html','../demo.html']){
  const html=read(file);
  assert.match(html,/src\/calendar-bridge\.js/);
  assert.match(html,/src\/calendar-manual\.js/);
 }
});
