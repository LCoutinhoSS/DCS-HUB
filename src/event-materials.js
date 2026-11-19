/* DCS HUB v0.13 — Materiais editáveis com aprovação do Cerimonial e DOCX.
 * Editor integral na aba de evento, sem popup. Todo documento oficial de saída
 * depende da versão aprovada, e o servidor rejeita conteúdo desatualizado.
 */
(function(){
'use strict';
const B=()=>window.DCS_BRIDGE;
const $=q=>document.querySelector(q);
const real=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={roteiro:'Roteiro do evento',resumo_reuniao:'Resumo da reunião'};
const blockTypes={title:'Título',subtitle:'Subtítulo',heading:'Seção',text:'Parágrafo',bullet:'Item de lista',time:'Etapa/horário',meta:'Informação',note:'Observação'};
const state=new Map(),inflight=new Map();
let editor=null,busy=false;
const now=()=>new Date().toISOString();
function reset(){state.clear();inflight.clear();editor=null;busy=false;}
function isEditor(){return B()?.S?.role!=='Leitor';}
function canApprove(){return ['Administrador','Gestor','Servidor Cerimonial'].includes(B()?.S?.role);}
function eventFor(id){return B()?.E?.find(e=>e.id===id);}
function canOperate(ev){return isEditor()&&!!ev&&!['Cancelado','Concluído'].includes(ev.st);}
const fmt=d=>{try{return new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}catch(_){return 'A confirmar';}};
function latestSourceTime(ev){
 const data=window.DCS_GABINETE?.getData?.(ev.id)||{answers:[],participants:[]};
 const values=[ev.updatedAt,...(data.answers||[]).map(x=>x.updated_at),
  ...(data.participants||[]).map(x=>x.updated_at),
  ...(window.DCS_MEETINGS?.eventMeetings?.(ev.id)||[]).map(x=>x.updated_at)]
  .map(x=>Date.parse(x)).filter(Number.isFinite);
 return values.length?Math.max(...values):0;
}
function stale(ev,record,when){
 const instant=Date.parse(record?.[when]);
 return Number.isFinite(instant)&&latestSourceTime(ev)>instant+500;
}
async function load(eventId,force=false){
 if(!real()){if(!state.has(eventId))state.set(eventId,[]);return state.get(eventId);}
 if(state.has(eventId)&&!force)return state.get(eventId);
 if(inflight.has(eventId))return inflight.get(eventId);
 const req=window.DCS_BACKEND.listEventMaterials(eventId).then(rows=>{
  state.set(eventId,rows);return rows;
 }).finally(()=>inflight.delete(eventId));
 inflight.set(eventId,req);
 return req;
}
function rerender(eventId){
 if(B()?.S?.route==='eventos'&&B()?.S?.ev===eventId&&B()?.S?.tb==='materiais')B()?.rr();
}
function ensure(eventId){
 if(!state.has(eventId)&&!inflight.has(eventId)){
  load(eventId).then(()=>rerender(eventId)).catch(err=>{
   state.set(eventId,[]);B()?.toast('Falha ao carregar materiais: '+err.message);rerender(eventId);
  });
 }
 return state.has(eventId);
}
function get(evId,kind){return(state.get(evId)||[]).find(x=>x.kind===kind)||null;}
function status(rec,ev){
 if(!rec)return {text:'Ainda não preparado',key:'empty'};
 if(rec.approved_version===rec.version&&rec.approved_at){
  if(stale(ev,rec,'approved_at'))return {text:'Revisão vencida após mudanças',key:'stale'};
  return {text:'Aprovado para exportação',key:'approved'};
 }
 return {text:rec.approved_version?'Nova revisão necessária':'Rascunho a revisar',key:'draft'};
}
function cards(ev){
 return '<div class="materials-grid">'+Object.entries(kinds).map(([kind,label])=>{
  const rec=get(ev.id,kind),s=status(rec,ev),isRoute=kind==='roteiro';
  return '<article class="materials-card"><div class="materials-card-top">'+
   '<span class="materials-symbol">'+(isRoute?'01':'02')+'</span>'+
   '<span class="materials-status materials-'+s.key+'">'+esc(s.text)+'</span></div>'+
   '<h3>'+esc(label)+'</h3>'+
   '<p>'+(isRoute?'Sequência de abertura, falas, homenagens e encerramento. Horários não informados ficam a confirmar.':
     'Decisões alinhadas com o gabinete, pendências, convidados e responsáveis pelas providências.')+'</p>'+
   (rec?'<small>Versão '+rec.version+' · salvo '+esc(fmt(rec.saved_at))+'</small>':
    '<small>Sem documento criado para este evento.</small>')+
   '<button class="btn '+(rec?'':'pri')+'" data-material-open="'+esc(kind)+'"> '+
   (rec?'Visualizar / revisar':'Preparar documento')+'</button></article>';
 }).join('')+'</div>';
}
function selectTypes(current){
 return '<select class="fi material-type-select" data-material-type>'+
 Object.entries(blockTypes).map(([k,v])=>'<option value="'+k+'"'+(current===k?' selected':'')+'>'+esc(v)+'</option>').join('')+
 '</select>';
}
function blockEditor(block,i,canEdit){
 const value=esc(block.text||'');
 if(!canEdit)return '<div class="material-read-block material-read-'+esc(block.kind)+'">'+
  (blockTypes[block.kind]==='Seção'?'<small>SEÇÃO</small>':'')+'<p>'+value+'</p></div>';
 return '<div class="material-block" data-material-row><div class="material-block-controls">'+
  selectTypes(block.kind)+
  '<button class="btn" data-material-move="'+i+':-1" type="button" title="Mover para cima">↑</button>'+
  '<button class="btn" data-material-move="'+i+':1" type="button" title="Mover para baixo">↓</button>'+
  '<button class="btn" data-material-remove="'+i+'" type="button" title="Remover trecho">×</button></div>'+
  '<textarea class="fi" data-material-text="'+i+'" maxlength="2000" rows="'+(block.text?.length>150?3:2)+'" aria-label="Texto do trecho '+(i+1)+'">'+value+'</textarea></div>';
}
function editView(ev){
 const kind=editor?.kind,rec=get(ev.id,kind);
 const allowed=canOperate(ev);
 const approved=status(rec,ev).key==='approved';
 const warning=status(rec,ev).key==='stale';
 const visibleBlocks=editor?.blocks||[];
 return '<div class="material-doc-view"><div class="material-doc-toolbar">'+
 '<button class="btn" data-material-back type="button">← Voltar aos modelos</button>'+
 '<div class="hub-actions"><span class="materials-status materials-'+status(rec,ev).key+'">'+esc(status(rec,ev).text)+'</span>'+
  (rec?'<span class="material-version">Versão '+rec.version+'</span>':'')+'</div></div>'+
 '<div class="material-doc-title"><span class="hub-kicker">Documento editável · Conferência</span><h2>'+esc(kinds[kind])+'</h2>'+
 '<p>Revise a minuta com as informações do evento. O texto continua editável; nenhum arquivo é publicado automaticamente.</p></div>'+
 (warning?'<div class="materials-warning">A Ficha do Gabinete, os participantes ou o evento mudaram após a aprovação. Gere ou revise e salve uma nova versão para obter outra autorização.</div>':'')+
 '<div class="material-actionbar">'+
 (allowed?'<button class="btn" data-material-generate="'+esc(kind)+'" type="button">Regerar a partir do HUB</button>':'')+
 (allowed?'<button class="btn pri" data-material-save="'+esc(kind)+'" type="button">Salvar rascunho</button>':'')+
 (rec&&approved?'<button class="btn pri" data-material-export="'+esc(kind)+'" type="button">Baixar Word (.docx)</button>':'')+
 '</div>'+
 '<div class="material-paper"><div class="material-paper-kicker">DCS HUB · MINUTA DO CERIMONIAL</div>'+
 '<div class="material-paper-note">Informações preliminares permanecem como A CONFIRMAR. O usuário revisor responde pela conferência institucional.</div>'+
 '<div class="material-edit-list">'+(visibleBlocks.length?visibleBlocks.map((x,i)=>blockEditor(x,i,allowed)).join(''):'<p>Sem conteúdo. Clique em regerar.</p>')+'</div>'+
 '</div>'+
 (allowed?'<div class="material-actionbar"><button class="btn" data-material-add type="button">+ Adicionar trecho</button>'+
 '<button class="btn pri" data-material-save="'+esc(kind)+'" type="button">Salvar rascunho</button></div>':'')+
 '<section class="material-review"><h3>Conferência do Cerimonial</h3>'+
 '<p>Somente Servidor Cerimonial, Gestor ou Administrador pode aprovar a versão para exportação. Se o briefing for alterado, o documento precisa passar por nova revisão.</p>'+
 (rec?'<p><b>Versão '+rec.version+'</b> · '+esc(rec.approved_at?'Aprovação anterior: '+fmt(rec.approved_at):'Ainda sem aprovação')+'</p>':'<p>Salve um rascunho para iniciar a conferência.</p>')+
 (rec&&canApprove()&&canOperate(ev)&&!approved?
  '<label class="material-confirm"><input type="checkbox" id="material-review-check"> Conferi os dados, as pendências, a composição da mesa e autorizo a exportação desta versão como documento revisado.</label>'+
  '<button class="btn pri" data-material-approve="'+esc(kind)+'" type="button">Aprovar versão '+rec.version+'</button>':'')+
 (rec&&approved?'<p class="materials-approved-note">Esta versão está aprovada. Se editar ou regerar, a aprovação precisará ser refeita.</p>':'')+
 '</section></div>';
}
function render(ev){
 if(!ensure(ev.id))return '<section class="card p"><p>Carregando documentos do evento…</p></section>';
 return '<div class="materials-shell"><header class="materials-head"><div class="hub-kicker">Cerimonial · Documentos do evento</div>'+
 '<h2>Roteiro e Resumo da Reunião</h2>'+
 '<p>Prepare, corrija, salve e revise antes de exportar. Os documentos originais não estão armazenados no GitHub público.</p></header>'+
 (editor?.eventId===ev.id?editView(ev):cards(ev))+
 '</div>';
}
function collect(){
 if(!editor)return [];
 const rows=[...document.querySelectorAll('#view [data-material-row]')];
 if(rows.length){
  editor.blocks=rows.map(row=>({
   kind:row.querySelector('[data-material-type]')?.value||'text',
   text:String(row.querySelector('[data-material-text]')?.value||'').trim().slice(0,2000)
  })).filter(x=>x.text.length);
 }
 return editor.blocks.map(x=>({...x}));
}
async function start(evId,kind){
 if(!kinds[kind])return;
 const ev=eventFor(evId);if(!ev)return;
 await load(evId);
 const rec=get(evId,kind);
 if(rec)editor={eventId:evId,kind,blocks:rec.blocks.map(b=>({...b}))};
 else if(canOperate(ev)){
  await generate(evId,kind,true);
  return;
 }else editor={eventId:evId,kind,blocks:[]};
 rerender(evId);
}
async function generate(evId,kind,first=false){
 const ev=eventFor(evId);if(!ev||!canOperate(ev))throw Error('Sem permissão para preparar materiais');
 if(!first&&editor?.blocks?.length&&!window.confirm('Substituir o texto em edição pelos dados atuais do HUB? Alterações ainda não salvas serão perdidas.'))return;
 const gab=await window.DCS_GABINETE.ensure(evId);
 if(real())await window.DCS_BACKEND.refreshMeetings();
 const meetings=window.DCS_MEETINGS?.eventMeetings?.(evId)||[];
 const tasks=(B()?.T||[]).filter(t=>t.eid===evId);
 const questions=window.DCS_GABINETE.questions(ev.kind);
 const blocks=window.DCS_MATERIAL_BUILDER.build(kind,ev,gab,meetings,tasks,questions);
 editor={eventId:evId,kind,blocks};
 rerender(evId);
}
async function save(evId,kind){
 const ev=eventFor(evId);
 if(!canOperate(ev))throw Error('Sem permissão para salvar rascunho');
 const blocks=collect();if(blocks.length<2||blocks.length>140)throw Error('O documento precisa ter de 2 a 140 trechos');
 if(blocks.some(x=>!blockTypes[x.kind]||!x.text||x.text.length>2000))throw Error('Verifique os textos e categorias dos trechos');
 if(real())await window.DCS_BACKEND.saveEventMaterial(evId,kind,blocks);
 else{
  const list=await load(evId),rec=get(evId,kind);
  if(rec){rec.blocks=blocks;rec.version++;rec.saved_at=now();}
  else list.push({event_id:evId,kind,blocks,version:1,approved_version:null,
    saved_at:now(),approved_at:null});
 }
 await load(evId,true);
 editor={eventId:evId,kind,blocks};
 rerender(evId);
 B().toast('Rascunho salvo · aguardando conferência');
}
async function approve(evId,kind){
 const ev=eventFor(evId),rec=get(evId,kind);
 if(!canApprove()||!canOperate(ev)||!rec)throw Error('Apenas Cerimonial ou gestão pode aprovar');
 if(stale(ev,rec,'saved_at'))throw Error('Dados do evento alterados depois do rascunho. Refaça a revisão');
 if(!$('#material-review-check')?.checked)throw Error('Confirme que revisou o conteúdo e as pendências');
 if(real())await window.DCS_BACKEND.approveEventMaterial(evId,kind,rec.version);
 else{rec.approved_version=rec.version;rec.approved_at=now();}
 await load(evId,true);rerender(evId);
 B().toast('Documento revisado e liberado para Word');
}
async function exportDoc(evId,kind){
 const ev=eventFor(evId),rec=get(evId,kind);
 if(!rec||status(rec,ev).key!=='approved')throw Error('A versão precisa estar aprovada e atualizada');
 // Não usa o rascunho local: sempre consulta a versão aprovada e atual no backend.
 const blocks=real()?await window.DCS_BACKEND.exportEventMaterial(evId,kind):rec.blocks;
 const file=window.DCS_DOCX.create(blocks,{status:'approved'});
 window.DCS_DOCX.download(file,window.DCS_DOCX.filename(kind,ev.t));
 B().toast('Documento Word editável gerado');
}
function act(action){if(busy)return;busy=true;
 Promise.resolve().then(action).catch(e=>B()?.toast('Documento: '+e.message))
 .finally(()=>{busy=false;});
}
document.addEventListener('click',e=>{
 const opening=e.target.closest('[data-material-open]');
 if(opening){const id=B()?.S.ev;act(()=>start(id,opening.dataset.materialOpen));return;}
 const back=e.target.closest('[data-material-back]');if(back){editor=null;rerender(B()?.S.ev);return;}
 const generateBtn=e.target.closest('[data-material-generate]');
 if(generateBtn){act(()=>generate(B()?.S.ev,generateBtn.dataset.materialGenerate));return;}
 const saveBtn=e.target.closest('[data-material-save]');
 if(saveBtn){act(()=>save(B()?.S.ev,saveBtn.dataset.materialSave));return;}
 const approveBtn=e.target.closest('[data-material-approve]');
 if(approveBtn){act(()=>approve(B()?.S.ev,approveBtn.dataset.materialApprove));return;}
 const exportBtn=e.target.closest('[data-material-export]');
 if(exportBtn){act(()=>exportDoc(B()?.S.ev,exportBtn.dataset.materialExport));return;}
 if(e.target.closest('[data-material-add]')){
  const blocks=collect();
  blocks.push({kind:'text',text:'Novo trecho — preencher antes de salvar'});
  editor.blocks=blocks;rerender(editor.eventId);return;
 }
 const rem=e.target.closest('[data-material-remove]');
 if(rem){const blocks=collect();blocks.splice(Number(rem.dataset.materialRemove),1);editor.blocks=blocks;rerender(editor.eventId);return;}
 const mv=e.target.closest('[data-material-move]');
 if(mv){
  const blocks=collect(),[a,d]=mv.dataset.materialMove.split(':').map(Number),b=a+d;
  if(b>=0&&b<blocks.length)[blocks[a],blocks[b]]=[blocks[b],blocks[a]];
  editor.blocks=blocks;rerender(editor.eventId);
 }
});
window.DCS_MATERIALS={render,reset,load,start,status,sourceChanged:stale};
})();