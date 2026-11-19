import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const ov=read('../src/event-overview.js');
const gab=read('../src/event-briefing.js');
const demoAuth=read('../src/demo-auth.js');
const index=read('../index.html');
const demo=read('../demo.html');
const admin=read('../src/admin.js');

test('visão rápida reúne decisões, pendências, participantes, tarefas e reunião',()=>{
 const doc={addEventListener(){}};
 const event={id:'e1',t:'Sessão Solene — Exemplo',c:'cer',kind:'sessao_solene',d:new Date('2026-12-01T19:00:00'),
   loc:'Espaço exemplo',requester_name:'Gabinete Teste',who:['Servidor exemplo'],team:'Cerimonial',
   st:'Pendente',chk:[{applicable:true,d:false},{applicable:true,d:true}]};
 const answers=[
  {question_key:'publico',answer:'150 pessoas',status:'confirmed',updated_at:'2026-11-19T13:00:00Z'},
  {question_key:'hino',answer:'Banda solicitada',status:'to_confirm'}
 ];
 const people=[{full_name:'Pessoa teste',role_title:'Representante',organization:'Instituição',
  participation:'mesa',invitation_status:'confirmed',active:true}];
 const questions=[{key:'publico',title:'Qual público?'},{key:'hino',title:'Terá hino?'},{key:'mesa',title:'Quem compõe a mesa?'}];
 const win={DCS_BRIDGE:{S:{role:'Servidor DCS',route:'eventos',ev:'e1',tb:'geral',in:0},E:[event],
 T:[{id:'t1',eid:'e1',t:'Enviar roteiro',w:'Servidor teste',due:'30/11/2026',s:'Pendente'}],rr(){},toast(){}},
 DCS_GABINETE:{getData(){return {answers,participants:people}},questions(){return questions}},
 DCS_CHECKLISTS:{find:()=>['sessao_solene','Sessão solene','cer']},
 DCS_MEETINGS:{eventMeetings:()=>[{title:'Reunião com gabinete',starts_at:'2026-11-19T13:00:00Z',status:'realizada',
  agenda:'Conferir mesa',decisions:'Enviar roteiro'}]},DCS_TASKS:{isOverdue:()=>false}};
 vm.runInNewContext(ov,{window:win,document:doc,navigator:{},console,Promise});
 const html=win.DCS_EVENT_OVERVIEW.render(event);
 for(const label of ['O essencial para a equipe','150 pessoas','Banda solicitada','Pessoa teste','Enviar roteiro',
 'Reunião com gabinete','Nominatas','Prismas','Copiar resumo']){
  assert.ok(html.includes(label),label+' deveria aparecer');
 }
 const text=win.DCS_EVENT_OVERVIEW.summaryText(event);
 assert.match(text,/PENDÊNCIAS COM O GABINETE/);
 assert.match(text,/ROTEIRO|Enviar roteiro/);
 assert.match(text,/Solicitante: Gabinete Teste/);
});

test('o mesmo resumo serve a um Leitor sem liberar edição do briefing',()=>{
 const doc={addEventListener(){}},w={DCS_BRIDGE:{S:{role:'Leitor',route:'eventos',ev:'e1',tb:'geral',in:0},T:[],E:[]},
 DCS_GABINETE:{getData:()=>({answers:[],participants:[]}),questions:()=>[]},DCS_MEETINGS:{eventMeetings:()=>[]}};
 vm.runInNewContext(ov,{window:w,document:doc,navigator:{},console,Promise});
 const html=w.DCS_EVENT_OVERVIEW.render({id:'e1',t:'Fictício',st:'Pendente',loc:'Teste',
   d:new Date('2026-12-01'),who:[],chk:[]});
 assert.match(html,/O essencial para a equipe/);
 assert.match(html,/Ainda não há respostas confirmadas/);
 assert.doesNotMatch(html,/data-gab-form|data-person-add|data-flow-delegate/);
});

test('ficha carrega registro de teste fictício e o resumo consulta o mesmo cache',()=>{
 assert.match(gab,/getData\(id\)/);
 assert.match(gab,/\['geral','gabinete','participantes'\]/);
 assert.match(gab,/Convidada Exemplo/);
 assert.match(gab,/Demonstração/);
 assert.match(ov,/getData\?\./);
});

test('login de servidor comum é apenas demonstração, sem alterar Supabase Auth',()=>{
 assert.match(demoAuth,/usuario@demo\.dcs-hub\.invalid/);
 assert.match(demoAuth,/role:'Servidor DCS'/);
 assert.match(demoAuth,/const password='DCSdemo2026!'/);
 assert.match(demoAuth,/window\.DCS_BACKEND\?\.enabled/);
 assert.match(admin,/Supabase compartilhada com o Autoridades SP/);
 for(const page of [index,demo]){
  assert.match(page,/event-overview\.js/);
  assert.match(page,/event-overview\.css/);
  assert.match(page,/\['geral','Visão rápida'\]/);
  assert.match(page,/DCS_EVENT_OVERVIEW\.render\(e\)/);
  assert.match(page,/usuario@demo\.dcs-hub\.invalid/);
 }
});

test('materiais institucionais usados como padrões, sem alegar anexos ou geração já existentes',()=>{
 assert.match(ov,/Roteiro/);
 assert.match(ov,/Resumo da reunião/);
 assert.match(ov,/Nominatas/);
 assert.match(ov,/Prismas/);
 assert.match(ov,/não foram publicados nem vinculados automaticamente/i);
 assert.doesNotMatch(ov,/\.docx|\.pptx|\.doc\b/);
});
