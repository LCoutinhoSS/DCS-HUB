import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function helper(){
 const listeners={};
 const c={window:{DCS_GABINETE:{renderParticipants:()=>'<section class="gab-protocol-panel"></section>',getData:()=>({participants:[]})}},
 document:{addEventListener:(k,fn)=>{listeners[k]=fn;}}};
 vm.runInNewContext(read('../src/mesa-reorder.js'),c);
 return c.window.DCS_MESA_ORDER;
}
test('ordem mantém apenas integrantes ativos que não recusaram',()=>{
 const o=helper();
 const rows=[
 {id:'b',full_name:'B',participation:'mesa',protocol_order:2,active:true,invitation_status:'confirmed'},
 {id:'a',full_name:'A',participation:'mesa',protocol_order:1,active:true,invitation_status:'confirmed'},
 {id:'x',full_name:'X',participation:'mesa',active:false},
 {id:'y',full_name:'Y',participation:'mesa',invitation_status:'declined'},
 {id:'z',full_name:'Z',participation:'fala'}
 ];
 assert.deepEqual(Array.from(o.ordered(rows),p=>p.id),['a','b']);
});
test('mover antes e depois mantém exatamente os IDs',()=>{
 const o=helper();
 assert.deepEqual([...o.move(['a','b','c'],'a','c',true)],['b','c','a']);
 assert.deepEqual([...o.move(['a','b','c'],'c','a')],['c','a','b']);
 assert.deepEqual([...o.move(['a','b','c'],'b','b')],['a','b','c']);
});
test('API, interface e banco têm validação otimista e trilha de alterações',()=>{
 const ui=read('../src/mesa-reorder.js');
 const sql=read('../supabase/migrations/202611190016_mesa_reorder_atomic.sql');
 const api=read('../src/backend.js');
 assert.match(ui,/data-mesa-save/);
 assert.match(ui,/dragstart/);
 assert.match(ui,/ArrowDown/);
 assert.match(ui,/reorderEventMesa\(eid,d.ids,d.expected\)/);
 assert.match(api,/dcs_reorder_event_mesa/);
 assert.match(sql,/for update/);
 assert.match(sql,/p.updated_at is distinct from/);
 assert.match(sql,/mesa_reordered/);
 assert.match(sql,/grant execute on function/);
});

test('quadro visual renderiza posição e ações apenas a usuários editores',()=>{
 for(const role of ['Servidor Cerimonial','Leitor']){
  const rows=[
   {id:'p1',full_name:'Pessoa A',role_title:'Deputada',honorific:'Senhora',participation:'mesa',protocol_order:2,invitation_status:'confirmed',active:true,updated_at:'2026-11-19T12:00:00Z'},
   {id:'p2',full_name:'Pessoa B',role_title:'Secretária',honorific:'Senhora',participation:'mesa',protocol_order:1,invitation_status:'confirmed',active:true,updated_at:'2026-11-19T12:00:00Z'}
  ];
  const listeners={},bridge={S:{role},E:[{id:'evt',st:'Em andamento'}],rr(){}};
  const context={window:{
   DCS_BRIDGE:bridge,
   DCS_GABINETE:{
    renderParticipants:()=>'<main><section class="gab-protocol-panel"><p>Antigo</p></section></main>',
    getData:()=>({participants:rows})
   }
  },document:{addEventListener:(event,fn)=>{listeners[event]=fn;}}};
  vm.runInNewContext(read('../src/mesa-reorder.js'),context);
  const html=context.window.DCS_GABINETE.renderParticipants({id:'evt',st:'Em andamento'});
  assert.ok(html.indexOf('Pessoa B')<html.indexOf('Pessoa A'));
  assert.match(html,/Ordem da mesa para nominatas e prismas/);
  if(role==='Leitor')assert.doesNotMatch(html,/data-mesa-dir=/);
  else assert.match(html,/data-mesa-dir="down"/);
 }
});
