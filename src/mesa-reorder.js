/* DCS HUB 0.15 — composição de mesa por arraste, setas e teclado.
 * A sequência protocolar é definida pela equipe, não calculada pelo sistema.
 */
(function(){
'use strict';
const G=window.DCS_GABINETE;
if(!G?.renderParticipants)throw Error('Módulo Pessoas e mesa não encontrado');
const orig=G.renderParticipants;
const drafts=new Map(),saving=new Set();
let dragging=null;
const B=()=>window.DCS_BRIDGE;
const live=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canEdit=ev=>B()?.S?.role!=='Leitor'&&!['Concluído','Cancelado'].includes(ev.st);
function ordered(rows){
 return (rows||[]).filter(p=>p.active!==false&&p.participation==='mesa'&&p.invitation_status!=='declined')
  .sort((a,b)=>(a.protocol_order||999)-(b.protocol_order||999)||
    String(a.full_name||'').localeCompare(String(b.full_name||''),'pt-BR')||
    String(a.id||'').localeCompare(String(b.id||'')));
}
function move(ids,source,target,after=false){
 if(!Array.isArray(ids)||source===target||!ids.includes(source)||!ids.includes(target))return (ids||[]).slice();
 const next=ids.filter(id=>id!==source);
 next.splice(next.indexOf(target)+(after?1:0),0,source);
 return next;
}
function get(eventId){
 const base=ordered(G.getData(eventId)?.participants||[]);
 const d=drafts.get(eventId);
 if(d&&(base.length!==d.ids.length||d.ids.some(id=>!base.some(p=>p.id===id))))drafts.delete(eventId);
 const draft=drafts.get(eventId);
 return {base,draft,ids:draft?draft.ids.slice():base.map(p=>p.id)};
}
function panel(ev){
 const {base,draft,ids}=get(ev.id),byId=new Map(base.map(p=>[p.id,p]));
 const rows=ids.map(id=>byId.get(id)).filter(Boolean);
 const values=rows.map(p=>p.protocol_order).filter(Boolean);
 const duplicate=values.filter((v,i)=>values.indexOf(v)!==i).length;
 const unresolved=rows.filter(p=>p.invitation_status!=='confirmed'||!p.protocol_order||!p.role_title?.trim()||!p.honorific?.trim()).length+duplicate;
 const edit=canEdit(ev);
 return '<section class="gab-protocol-panel gab-mesa-editor"><div class="gab-protocol-head"><div>'+
 '<h3>Ordem da mesa para nominatas e prismas</h3>'+
 '<p>Organize por arraste, setas ou teclado. O Cerimonial define a precedência; o HUB apenas registra a sequência.</p></div>'+
 '<span class="gab-status '+(draft||unresolved?'gab-status-to_confirm':'gab-status-confirmed')+'">'+
 (draft?'Prévia não salva':unresolved?unresolved+' ajuste(s) pendente(s)':'Mesa pronta para conferência')+'</span></div>'+
 (rows.length?'<div class="gab-protocol-list" role="list" aria-label="Ordem manual da mesa">'+
 rows.map((p,i)=>'<div class="gab-protocol-row" role="listitem" data-mesa-id="'+esc(p.id)+'" data-mesa-event="'+esc(ev.id)+'"'+
 (edit?' draggable="true" tabindex="0" aria-label="Posição '+(i+1)+': '+esc(p.full_name)+'. Use as setas do teclado para alterar."':'')+'>'+
 '<span class="gab-protocol-num">'+(draft?i+1:esc(p.protocol_order||'—'))+'</span>'+
 '<div><b>'+esc(p.full_name)+'</b><small>'+esc([p.honorific,p.role_title].filter(Boolean).join(' · ')||'Tratamento/cargo a confirmar')+
 ' · '+(p.invitation_status==='confirmed'?'Presença confirmada':'Presença a confirmar')+'</small></div>'+
 (edit?'<div class="gab-protocol-actions">'+
 '<button type="button" class="btn" data-mesa-dir="up" data-mesa-id="'+esc(p.id)+'" data-mesa-event="'+esc(ev.id)+'" aria-label="Subir '+esc(p.full_name)+'"'+(i===0?' disabled':'')+'>↑</button>'+
 '<button type="button" class="btn" data-mesa-dir="down" data-mesa-id="'+esc(p.id)+'" data-mesa-event="'+esc(ev.id)+'" aria-label="Descer '+esc(p.full_name)+'"'+(i===rows.length-1?' disabled':'')+'>↓</button>'+
 '<button type="button" class="btn" data-person-edit="'+esc(p.id)+'" data-person-event="'+esc(ev.id)+'">Ajustar</button></div>':'')+
 '</div>').join('')+'</div>':'<p class="gab-hint">Nenhuma pessoa indicada para a mesa.</p>')+
 (draft?'<div class="gab-mesa-save"><span class="gab-hint">Confira a sequência antes de salvar.</span>'+
 '<button type="button" class="btn" data-mesa-cancel="'+esc(ev.id)+'">Descartar</button>'+
 '<button type="button" class="btn pri" data-mesa-save="'+esc(ev.id)+'">Salvar ordem</button></div>':'')+'</section>';
}
G.renderParticipants=function(ev){
 const html=orig(ev);
 if(!html.includes('gab-protocol-panel'))return html;
 return html.replace(/<section class="gab-protocol-panel">[\s\S]*?<\/section>/,panel(ev));
};
function renderFocus(id){
 B().rr();
 if(id)document.querySelectorAll('[data-mesa-event][data-mesa-id]').forEach(x=>{if(x.dataset.mesaId===id&&x.tabIndex===0)x.focus();});
}
function reorder(eid,from,to,after){
 const ev=B()?.E?.find(x=>x.id===eid);if(!ev||!canEdit(ev)||saving.has(eid))return;
 const {base,draft,ids}=get(eid),next=move(ids,from,to,after);
 if(next.join('|')===ids.join('|'))return;
 if(next.join('|')===base.map(p=>p.id).join('|'))drafts.delete(eid);
 else drafts.set(eid,{ids:next,expected:draft?.expected||Object.fromEntries(base.map(p=>[p.id,p.updated_at||null]))});
 renderFocus(from);
}
async function save(eid){
 const ev=B()?.E?.find(x=>x.id===eid),d=drafts.get(eid);
 if(!ev||!canEdit(ev)||!d||saving.has(eid))return;
 saving.add(eid);
 try{
  if(live()){
   await window.DCS_BACKEND.reorderEventMesa(eid,d.ids,d.expected);
   await G.ensure(eid,true);
  }else{
   const state=G.getData(eid);
   d.ids.forEach((id,i)=>{const p=state.participants.find(x=>x.id===id);
    if(p){p.protocol_order=i+1;p.updated_at=new Date().toISOString();}});
  }
  drafts.delete(eid);B().rr();
  B().toast('Ordem da mesa salva. Regerar e revisar as nominatas e os prismas.');
 }catch(err){
  drafts.delete(eid);
  if(live())await G.ensure(eid,true).catch(()=>{});
  B().rr();B().toast('Não foi possível salvar a ordem: '+err.message);
 }finally{saving.delete(eid);}
}
document.addEventListener('click',e=>{
 const direction=e.target.closest('[data-mesa-dir]');if(direction){
  const eid=direction.dataset.mesaEvent,id=direction.dataset.mesaId,down=direction.dataset.mesaDir==='down';
  const ids=get(eid).ids,target=ids[ids.indexOf(id)+(down?1:-1)];
  if(target)reorder(eid,id,target,down);
  return;
 }
 const cancel=e.target.closest('[data-mesa-cancel]');if(cancel){drafts.delete(cancel.dataset.mesaCancel);B().rr();return;}
 const go=e.target.closest('[data-mesa-save]');if(go){save(go.dataset.mesaSave);return;}
 const edit=e.target.closest('[data-person-edit],[data-person-disable],[data-person-add],[data-gab-refresh]');
 if(edit){
  const eid=edit.dataset.personEvent||edit.dataset.personAdd||edit.dataset.gabRefresh;
  if(eid)drafts.delete(eid);
 }
});
document.addEventListener('keydown',e=>{
 const row=e.target.closest?.('.gab-mesa-editor [data-mesa-id][draggable="true"]');
 if(row!==e.target||!['ArrowUp','ArrowDown'].includes(e.key))return;
 const eid=row.dataset.mesaEvent,id=row.dataset.mesaId,down=e.key==='ArrowDown';
 const ids=get(eid).ids,target=ids[ids.indexOf(id)+(down?1:-1)];
 if(target){e.preventDefault();reorder(eid,id,target,down);}
});
document.addEventListener('dragstart',e=>{
 const row=e.target.closest?.('.gab-mesa-editor [data-mesa-id][draggable="true"]');
 if(!row||saving.has(row.dataset.mesaEvent))return;
 dragging={event:row.dataset.mesaEvent,id:row.dataset.mesaId};
 if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',row.dataset.mesaId);}
 row.classList.add('gab-dragging');
});
document.addEventListener('dragover',e=>{
 const row=e.target.closest?.('.gab-mesa-editor [data-mesa-id][draggable="true"]');
 if(!row||!dragging||row.dataset.mesaEvent!==dragging.event||row.dataset.mesaId===dragging.id)return;
 e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';
 row.classList.add('gab-drag-target');
});
document.addEventListener('dragleave',e=>{
 const row=e.target.closest?.('.gab-mesa-editor [data-mesa-id]');
 if(row&&!row.contains(e.relatedTarget))row.classList.remove('gab-drag-target');
});
document.addEventListener('drop',e=>{
 const row=e.target.closest?.('.gab-mesa-editor [data-mesa-id][draggable="true"]');
 if(!row||!dragging||row.dataset.mesaEvent!==dragging.event)return;
 e.preventDefault();const rect=row.getBoundingClientRect();
 reorder(dragging.event,dragging.id,row.dataset.mesaId,e.clientY>rect.top+rect.height/2);
 dragging=null;
 document.querySelectorAll('.gab-dragging,.gab-drag-target').forEach(x=>x.classList.remove('gab-dragging','gab-drag-target'));
});
document.addEventListener('dragend',()=>{
 dragging=null;
 document.querySelectorAll('.gab-dragging,.gab-drag-target').forEach(x=>x.classList.remove('gab-dragging','gab-drag-target'));
});
window.DCS_MESA_ORDER=Object.freeze({ordered,move,reset:()=>drafts.clear()});
})();
