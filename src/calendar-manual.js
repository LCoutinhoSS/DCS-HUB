/* DCS HUB v0.17 — registro compartilhado de importação manual do Outlook.
 * Um servidor DECLARA a importação; o HUB não verifica agendas Microsoft.
 */
(function(){
'use strict';
const old=window.DCS_CALENDAR;
if(!old?.renderEvent||!old?.dates)throw Error('Ponte de calendário 0.16 não disponível');
const B=()=>window.DCS_BRIDGE;
const live=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const records=new Map();
const writing=new Set();
let loaded=false,attempted=false,loading=null,lastError='';
const canWrite=()=>!!B()?.S?.in&&B().S.role!=='Leitor';
const allowed=old.eligible;
function snapshot(ev){
 const {start,end}=old.dates(ev);
 return {
  title:String(ev.t||''),
  starts_ms:start.getTime(),
  ends_ms:end.getTime(),
  location:String(ev.loc||'A definir')
 };
}
function stale(ev,rec){
 if(!rec?.snapshot)return false;
 const current=snapshot(ev),previous=rec.snapshot;
 return Object.keys(current).some(key=>current[key]!==previous[key]);
}
function statusOf(ev){
 const rec=records.get(ev.id)||null;
 if(rec&&ev.st==='Cancelado')return 'cancelled';
 if(!rec)return 'unrecorded';
 if(stale(ev,rec))return 'outdated';
 return 'recorded';
}
function refreshView(){
 if(B()?.S?.route==='eventos'&&B()?.S?.tb==='cal'&&B()?.S?.ev)B().rr();
}
function reset(){
 records.clear();writing.clear();loaded=false;attempted=false;loading=null;lastError='';
}
async function refresh(){
 if(!live()){loaded=true;return;}
 if(loading)return loading;
 attempted=true;
 loading=Promise.resolve().then(()=>window.DCS_BACKEND.listCalendarImports())
  .then(rows=>{
   records.clear();
   (rows||[]).forEach(row=>records.set(row.event_id,row));
   loaded=true;lastError='';
  })
  .catch(err=>{lastError=err.message||'Consulta indisponível';throw err;})
  .finally(()=>{loading=null;refreshView();});
 return loading;
}
function recordPanel(ev){
 if(live()&&!attempted){attempted=true;refresh().catch(()=>{});}
 const rec=records.get(ev.id),status=statusOf(ev);
 const title={
  unrecorded:'Importação ainda não registrada',
  recorded:'Importação manual declarada',
  outdated:'Atenção: evento alterado após a importação',
  cancelled:'Evento cancelado: conferir retirada do Outlook'
 }[status];
 const detail={
  unrecorded:'Nenhum integrante informou que este evento foi importado. O download do arquivo não conta como importação.',
  recorded:'Os dados do HUB correspondem à última versão declarada como importada. O Outlook não foi consultado.',
  outdated:'Título, local ou horário mudou desde a última confirmação. Atualize o compromisso manualmente no Outlook para evitar divergências.',
  cancelled:'O HUB não cancela compromissos no Outlook. A equipe deve localizar e remover o evento manualmente.'
 }[status];
 const ready=!live()||loaded;
 const stamp=rec?.imported_at?new Date(rec.imported_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'';
 const who=rec?.actor_label||'Integrante da equipe';
 return '<section class="dcs-manual-calendar"><div class="dcs-manual-head">'+
 '<div><h3>Controle da agenda da equipe</h3><p>Registro compartilhado: não é sincronização nem confirmação da Microsoft.</p></div>'+
 '<button type="button" class="btn" data-calendar-refresh="'+esc(ev.id)+'">Atualizar situação</button></div>'+
 (lastError?'<div class="hub-note">Não foi possível consultar os registros: '+esc(lastError)+'. Tente atualizar novamente.</div>':'')+
 (!ready?'<p class="mu">Consultando os registros compartilhados…</p>':
 '<div class="dcs-manual-state '+(status==='outdated'||status==='cancelled'?'dcs-manual-warning':'')+'">'+
 '<b>'+esc(title)+'</b><p>'+esc(detail)+'</p>'+
 (rec?'<small>Declarado em '+esc(stamp)+' por '+esc(who)+
 (rec.calendar_label?' · Calendário informado: '+esc(rec.calendar_label):' · Calendário não informado')+'</small>':'')+'</div>')+
 (ready&&canWrite()&&allowed(ev)?
 '<div class="dcs-manual-actions"><label>Calendário onde foi importado (opcional)'+
 '<input class="fi" maxlength="100" data-calendar-label="'+esc(ev.id)+'" value="'+esc(rec?.calendar_label||'')+'" placeholder="Ex.: Agenda compartilhada DCS"></label>'+
 '<label class="dcs-manual-confirm"><input type="checkbox" data-calendar-ack="'+esc(ev.id)+'"> Confirmo que importei ou atualizei este evento manualmente no Outlook.</label>'+
 '<div class="dcs-calendar-actions"><button type="button" class="btn pri" data-calendar-mark="'+esc(ev.id)+'" disabled>Registrar confirmação manual</button>'+
 (rec?'<button type="button" class="btn" data-calendar-clear="'+esc(ev.id)+'">Desfazer registro</button>':'')+'</div></div>':
 (ready&&canWrite()&&rec?'<div class="dcs-calendar-actions"><button type="button" class="btn" data-calendar-clear="'+esc(ev.id)+'">Desfazer registro</button></div>':''))+
 '<p class="dcs-manual-footnote">Registro colaborativo auditável: baixar o .ics, marcar esta opção ou informar o calendário não envia nada ao Outlook. Após reagendar ou cancelar, consulte e corrija o compromisso no calendário externo.</p></section>';
}
function renderEvent(ev){return old.renderEvent(ev)+recordPanel(ev);}
async function saveMark(eid,mark,label=''){
 if(writing.has(eid))return;
 const ev=B()?.E?.find(x=>x.id===eid);
 if(!ev||!canWrite())throw Error('Você não pode alterar este registro');
 if(mark&&!allowed(ev))throw Error('Confirme o evento antes de registrar a importação');
 const expected=snapshot(ev);
 writing.add(eid);
 try{
  if(live()){
   await window.DCS_BACKEND.setCalendarManualImport(eid,mark,label,expected);
   await refresh();
  }else{
   if(mark)records.set(eid,{event_id:eid,snapshot:expected,calendar_label:label,
    imported_at:new Date().toISOString(),actor_label:'Servidor de demonstração'});
   else records.delete(eid);
  }
  refreshView();
  B()?.toast?.(mark?'Confirmação manual registrada para a equipe':'Registro manual desfeito');
 }catch(err){
  if(live()){
   await window.DCS_BACKEND.reload().catch(()=>{});
   await refresh().catch(()=>{});
  }
  throw err;
 }finally{writing.delete(eid);}
}
document.addEventListener('change',e=>{
 const ack=e.target.closest?.('[data-calendar-ack]');
 if(!ack)return;
 const btn=document.querySelector('[data-calendar-mark="'+ack.dataset.calendarAck+'"]');
 if(btn)btn.disabled=!ack.checked;
});
document.addEventListener('click',e=>{
 const refreshButton=e.target.closest?.('[data-calendar-refresh]');
 if(refreshButton){
  e.preventDefault();
  Promise.resolve().then(async()=>{
   if(live())await window.DCS_BACKEND.reload();
   await refresh();
  }).catch(err=>B()?.toast?.('Não foi possível atualizar: '+err.message));
  return;
 }
 const mark=e.target.closest?.('[data-calendar-mark]');
 if(mark){
  e.preventDefault();
  const eid=mark.dataset.calendarMark;
  if(!document.querySelector('[data-calendar-ack="'+eid+'"]')?.checked)return;
  const label=document.querySelector('[data-calendar-label="'+eid+'"]')?.value.trim()||'';
  mark.disabled=true;
  saveMark(eid,true,label).catch(err=>B()?.toast?.('Não foi possível registrar: '+err.message))
   .finally(()=>{if(mark.isConnected)mark.disabled=false;});
  return;
 }
 const clear=e.target.closest?.('[data-calendar-clear]');
 if(clear){
  e.preventDefault();
  if(typeof window.confirm==='function'&&!window.confirm('Desfazer a declaração de importação manual deste evento?'))return;
  const eid=clear.dataset.calendarClear;clear.disabled=true;
  saveMark(eid,false).catch(err=>B()?.toast?.('Não foi possível desfazer: '+err.message))
   .finally(()=>{if(clear.isConnected)clear.disabled=false;});
 }
});
window.DCS_CALENDAR=Object.freeze({...old,renderEvent});
window.DCS_CALENDAR_MANUAL=Object.freeze({snapshot,stale,statusOf,getRecord(id){return records.get(id)||null;},hasLoaded(){return loaded;},refresh,reset,setData(rows){
 records.clear();(rows||[]).forEach(r=>records.set(r.event_id,r));loaded=true;attempted=true;lastError='';
}});
})();
