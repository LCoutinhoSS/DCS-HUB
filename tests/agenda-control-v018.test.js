import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function setup(){
 const status=new Map();
 const ev=(id,st='Confirmado',start='2026-11-28T18:00:00Z')=>({
  id,st,t:'Sessão '+id,loc:'Plenário JK',d:new Date(start),team:'Cerimonial'
 });
 const data=[
  ev('not-sent'),
  ev('changed'),
  ev('cancelled','Cancelado'),
  ev('correct','Concluído'),
  ev('awaiting','Pendente'),
  ev('canceled-no-record','Cancelado'),
  ev('awaiting-approval','Aguardando aprovação')
 ];
 status.set('changed','outdated');status.set('cancelled','cancelled');status.set('correct','recorded');
 const manual={statusOf:e=>status.get(e.id)||'unrecorded',getRecord:()=>null,hasLoaded:()=>true};
 const B={E:data,S:{in:0,route:'dashboard',tb:'',ev:null},toast:()=>{},rr:()=>{}};
 const win={DCS_BRIDGE:B,DCS_CALENDAR_MANUAL:manual,DCS_BACKEND:{enabled:false}};
 const handlers={};
 const document={addEventListener:(name,callback)=>{handlers[name]=callback;},querySelector:()=>null};
 vm.runInNewContext(read('../src/agenda-control.js'),{
  window:win,document,Date,Intl,queueMicrotask:fn=>fn()
 });
 return {api:win.DCS_AGENDA_CONTROL,data,manual,B,handlers};
}
test('fila separa pendências, importações desatualizadas, cancelamentos e confirmados',()=>{
 const {api,data}=setup();
 assert.equal(api.classify(data[0]),'unrecorded');
 assert.equal(api.classify(data[1]),'outdated');
 assert.equal(api.classify(data[2]),'cancelled');
 assert.equal(api.classify(data[3]),'recorded');
 assert.equal(api.classify(data[4]),'waiting');
 assert.equal(api.classify(data[5]),null,'cancelado sem declaração não entra na fila externa');
 assert.equal(api.classify(data[6]),'waiting');
});
test('contadores não equiparam declarações humanas a integrações reais',()=>{
 const {api,data}=setup(),c=api.summarize(data);
 assert.equal(c.unrecorded,1);
 assert.equal(c.outdated,1);
 assert.equal(c.cancelled,1);
 assert.equal(c.recorded,1);
 assert.equal(c.waiting,2);
 assert.equal(c.attention,3);
 assert.equal(c.all,6);
});
test('primeira fila prioriza cancelamentos, alterações e depois não registrados',()=>{
 const {api}=setup();
 const list=api.rows();
 assert.equal(Array.from(list,x=>x.id).join(','),'cancelled,changed,not-sent');
});
test('páginas registram nova rota, menu, painel, resumo e preservam o suporte a estabilidade',()=>{
 for(const file of ['../index.html','../demo.html']){
  const html=read(file);
  assert.match(html,/\['controle-agenda','Controle da agenda','cal'\]/);
  assert.match(html,/r==='controle-agenda'/);
  assert.match(html,/data-go="controle-agenda"/);
  assert.match(html,/id="agenda-pulse"/);
  assert.match(html,/DCS_AGENDA_CONTROL\?\.renderPulse/);
  assert.match(html,/src\/agenda-control.js/);
  assert.match(html,/src\/agenda-control.css/);
  assert.match(html,/DCS_VIEW_STABILITY/);
 }
 const manual=read('../src/calendar-manual.js');
 assert.match(manual,/getRecord\(id\)/);
 assert.match(manual,/hasLoaded\(\)/);
});
test('painel é apenas leitura: nenhuma gravação direta na Microsoft ou Supabase',()=>{
 const js=read('../src/agenda-control.js');
 assert.doesNotMatch(js,/\\.insert\\(|\\.upsert\\(|\\.update\\(|graph\\.microsoft\\.com|teamsForBusiness/i);
 assert.match(js,/Sem registro/);
 assert.match(js,/Conferir cancelamento/);
 assert.match(js,/não comprova sincronização/);
 assert.match(js,/data-control-open/);
});
