/* DCS HUB 0.17.1 — preserva posição, detalhes e edição durante atualizações da tela.
 * A navegação explícita pode mudar de aba; atualizações do mesmo painel não reiniciam o trabalho.
 */
(function(){
'use strict';
let lastKey=null;
const snapshots=new Map();
const fieldSelector='input,textarea,select';
function key(state){
 const s=state||{};
 const route=s.route||'dashboard';
 return [route,route==='eventos'?(s.ev||'lista'):'',route==='eventos'?(s.tb||'geral'):'',route==='agenda'?(s.vw||'mes'):''].join('|');
}
function detailKey(node,index){
 const explicit=node.getAttribute?.('data-gab-section')||node.getAttribute?.('data-detail-key')||node.id;
 return String(node.className||'details')+'|'+(explicit||String(index));
}
function captureForm(view){
 const active=document.activeElement;
 if(!active||!view.contains(active)||!['INPUT','TEXTAREA','SELECT'].includes(active.tagName))return null;
 const forms=Array.from(view.querySelectorAll('form'));
 const form=active.closest?.('form')||null,formIndex=form?forms.indexOf(form):-1;
 const elements=form?Array.from(form.querySelectorAll(fieldSelector)):Array.from(view.querySelectorAll(fieldSelector));
 const activeIndex=elements.indexOf(active);
 if(activeIndex<0)return null;
 const values=elements.map(el=>({
  tag:el.tagName,type:el.type,name:el.name||'',value:el.value,
  checked:el.type==='checkbox'||el.type==='radio'?el.checked:null
 }));
 let start=null,end=null;
 try{if(active.tagName!=='SELECT'&&active.type!=='number'&&active.type!=='date')start=active.selectionStart,end=active.selectionEnd;}catch(_){}
 return {formIndex,activeIndex,values,start,end};
}
function restoreForm(view,saved){
 if(!saved)return;
 const forms=Array.from(view.querySelectorAll('form'));
 const form=saved.formIndex>=0?forms[saved.formIndex]:null;
 if(saved.formIndex>=0&&!form)return;
 const elements=Array.from((form||view).querySelectorAll(fieldSelector));
 for(let i=0;i<saved.values.length;i++){
  const old=saved.values[i],field=elements[i];
  if(!field||field.tagName!==old.tag||field.name!==old.name||field.type!==old.type||field.type==='file')continue;
  if(old.checked!==null)field.checked=old.checked;
  else field.value=old.value;
 }
 const active=elements[saved.activeIndex];
 if(active&&active.tagName===saved.values[saved.activeIndex]?.tag){
  try{active.focus({preventScroll:true});}catch(_){active.focus();}
  try{if(saved.start!==null&&saved.end!==null)active.setSelectionRange(saved.start,saved.end);}catch(_){}
 }
}
function capture(view){
 const detailNodes=Array.from(view.querySelectorAll('details'));
 return {
  scrollTop:view.scrollTop,scrollLeft:view.scrollLeft,
  details:detailNodes.map((node,i)=>[detailKey(node,i),node.open]),
  activeForm:captureForm(view)
 };
}
function restore(view,saved,same){
 if(!saved){if(!same){view.scrollTop=0;view.scrollLeft=0;}return;}
 const expanded=new Map(saved.details);
 Array.from(view.querySelectorAll('details')).forEach((node,i)=>{
  const name=detailKey(node,i);
  if(expanded.has(name))node.open=expanded.get(name);
 });
 if(same)restoreForm(view,saved.activeForm);
 view.scrollTop=same?saved.scrollTop:Math.max(0,saved.scrollTop||0);
 view.scrollLeft=saved.scrollLeft||0;
}
function adopt(view,viewKey){
 if(!view||lastKey!==null)return;
 lastKey=viewKey;
 snapshots.set(viewKey,capture(view));
}
function render(view,viewKey,paint){
 if(typeof paint!=='function')throw Error('Renderização inválida');
 if(!view){paint();return;}
 if(lastKey===null)adopt(view,viewKey);
 if(lastKey!==null)snapshots.set(lastKey,capture(view));
 const existing=snapshots.get(viewKey);
 const same=lastKey===viewKey;
 paint();
 restore(view,existing,same);
 lastKey=viewKey;
 // Limite de memória para navegações longas.
 if(snapshots.size>35){const oldest=snapshots.keys().next().value;snapshots.delete(oldest);}
}
function reset(){lastKey=null;snapshots.clear();}
window.DCS_VIEW_STABILITY=Object.freeze({key,render,adopt,reset});
const B=window.DCS_BRIDGE;
if(B?.S)adopt(document.querySelector('#view'),key(B.S));
})();
