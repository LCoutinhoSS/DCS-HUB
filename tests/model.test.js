import test from 'node:test';
import assert from 'node:assert/strict';
import {eventPeriod,isVisibleOnDate,toUiEvent,toUiTask,ROLE_LABEL,EVENT_STATUS_LABEL,TASK_STATUS_CODE,localDatetime} from '../src/model.js';

test('exposições seguem por todos os dias, inclusive a data final',()=>{
 const d=eventPeriod('2026-11-20','09:00','2026-11-26');
 const event={start_at:d.start_at,end_at:d.end_at};
 assert.equal(isVisibleOnDate(event,new Date(2026,10,20)),true);
 assert.equal(isVisibleOnDate(event,new Date(2026,10,23)),true);
 assert.equal(isVisibleOnDate(event,new Date(2026,10,26)),true);
 assert.equal(isVisibleOnDate(event,new Date(2026,10,27)),false);
});
test('evento de um dia tem duração positiva sem término informado',()=>{
 const p=eventPeriod('2026-11-21','20:00','');
 assert.equal((new Date(p.end_at)-new Date(p.start_at))/3600000,1);
});
test('não aceita período invertido',()=>{
 assert.throws(()=>eventPeriod('2026-11-26','10:00','2026-11-24'),/Término/);
});
test('não normaliza datas inválidas silenciosamente',()=>{
 assert.throws(()=>localDatetime('2026-02-31','09:00'),/Data\/hora/);
});
test('converte checklist, status e responsáveis do banco para interface',()=>{
 const event={id:'a',title:'Exposição A',category:'exp',start_at:'2026-11-20T12:00:00.000Z',end_at:'2026-11-26T21:00:00.000Z',status:'confirmed',location:'Hall',owner_id:'id1'};
 const checklist=[{id:'c1',event_id:'a',position:2,label:'Desmontar',completed:false},{id:'c0',event_id:'a',position:1,label:'Montar',completed:true}];
 const e=toUiEvent(event,checklist,[],id=>id==='id1'?'Você':'Equipe');
 assert.equal(e.st,'Confirmado');assert.equal(e.who[0],'Você');assert.deepEqual(e.chk.map(c=>c.x),['Montar','Desmontar']);
 assert.equal(e.chk[0].d,true);
});
test('tarefas do modelo preservam ID e autoria de associação',()=>{
 const task={id:'t',title:'Preparar roteiro',event_id:'a',assignee_id:'id2',priority:'high',status:'pending',due_at:'2026-11-25',source_checklist_id:'c1'};
 const events=new Map([['a',{title:'Sessão Solene — Demo'}]]);
 const t=toUiTask(task,events,()=> 'Rafael');
 assert.equal(t.k,'modelo:c1');assert.equal(t.eid,'a');assert.equal(t.pri,'Alta');assert.equal(t.w,'Rafael');
});
test('papéis e status são mapeados sem conceder privilégios',()=>{
 assert.equal(ROLE_LABEL.reader,'Leitor');
 assert.equal(EVENT_STATUS_LABEL.pending,'Pendente');
 assert.equal(TASK_STATUS_CODE['Concluído'],'completed');
});
