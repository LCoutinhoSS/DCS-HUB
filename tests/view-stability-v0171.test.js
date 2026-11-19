import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function setup(){
 const details=[];
 const view={
  scrollTop:420,scrollLeft:0,
  querySelectorAll(selector){
   if(selector==='details')return details;
   if(selector==='form')return [];
   return [];
  },
  contains:()=>false
 };
 const document={activeElement:null,querySelector:()=>view};
 const window={DCS_BRIDGE:{S:{route:'eventos',ev:'e1',tb:'gabinete'}}};
 vm.runInNewContext(read('../src/view-stability.js'),{document,window});
 return {api:window.DCS_VIEW_STABILITY,view,details,document};
}
test('salvar resposta e atualizar painel não retorna ao topo',()=>{
 const {api,view,details}=setup();
 details.push({className:'gab-group',open:false,getAttribute:()=> 'Preparação'});
 details.push({className:'gab-group',open:true,getAttribute:()=> 'Autoridades'});
 api.adopt(view,'eventos|e1|gabinete|');
 view.scrollTop=820;
 api.render(view,'eventos|e1|gabinete|',()=>{
  view.scrollTop=0;
  details[0]={className:'gab-group',open:true,getAttribute:()=> 'Preparação'};
  details[1]={className:'gab-group',open:false,getAttribute:()=> 'Autoridades'};
 });
 assert.equal(view.scrollTop,820);
 assert.equal(details[0].open,false);
 assert.equal(details[1].open,true);
});
test('alternar entre eventos e abas mantém estado independente',()=>{
 const {api,view}=setup();
 api.render(view,'eventos|e1|gabinete|',()=>{view.scrollTop=0});
 view.scrollTop=300;
 api.render(view,'eventos|e1|participantes|',()=>{view.scrollTop=0});
 assert.equal(view.scrollTop,0);
 view.scrollTop=80;
 api.render(view,'eventos|e1|gabinete|',()=>{view.scrollTop=0});
 assert.equal(view.scrollTop,300);
 api.render(view,'eventos|e2|gabinete|',()=>{view.scrollTop=0});
 assert.equal(view.scrollTop,0);
});
test('texto digitado e foco sobrevivem à atualização assíncrona do mesmo formulário',()=>{
 const {api,view,document}=setup();
 let oldField,newField;
 const oldForm={querySelectorAll:()=>[oldField]},newForm={querySelectorAll:()=>[newField]};
 const formElements=[oldForm];
 oldField={
  tagName:'TEXTAREA',type:'textarea',name:'answer',value:'Resposta ainda não salva',
  selectionStart:8,selectionEnd:8,
  closest:()=>oldForm
 };
 newField={
  tagName:'TEXTAREA',type:'textarea',name:'answer',value:'',
  selectionStart:0,selectionEnd:0,
  closest:()=>newForm,
  focus:()=>{document.activeElement=newField;},
  setSelectionRange:(s,e)=>{newField.selectionStart=s;newField.selectionEnd=e;}
 };
 document.activeElement=oldField;
 view.contains=element=>element===oldField;
 view.querySelectorAll=selector=>{
  if(selector==='form')return formElements;
  if(selector==='details')return [];
  return [];
 };
 api.render(view,'eventos|e1|gabinete|',()=>{formElements[0]=newForm;view.scrollTop=0;});
 assert.equal(newField.value,'Resposta ainda não salva');
 assert.equal(document.activeElement,newField);
 assert.equal(newField.selectionStart,8);
});
test('páginas reais usam adaptador e mantêm foco ao fechar modal',()=>{
 for(const p of ['../index.html','../demo.html']){
  const html=read(p);
  assert.match(html,/src\/view-stability\.js/);
  assert.match(html,/DCS_VIEW_STABILITY/);
  assert.match(html,/focus\(\{preventScroll:true\}\)/);
 }
 const briefing=read('../src/event-briefing.js');
 assert.match(briefing,/data-gab-section/);
});
