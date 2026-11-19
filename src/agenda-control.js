/* DCS HUB v0.18 — central operacional de pendências de calendário.
 * Exibe somente dados já cadastrados no HUB. Não consulta calendários Microsoft.
 */
(function(){
'use strict';
const B=()=>window.DCS_BRIDGE;
const manual=()=>window.DCS_CALENDAR_MANUAL;
const live=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const config={
 unrecorded:{title:'Sem registro',sub:'Importação não declarada',icon:'○',css:'pending'},
 outdated:{title:'Atualização necessária',sub:'Mudou após a importação',icon:'!',css:'warning'},
 cancelled:{title:'Conferir cancelamento',sub:'Retirar do Outlook manualmente',icon:'×',css:'danger'},
 recorded:{title:'Conferidos',sub:'Declaração atualizada',icon:'✓',css:'ok'},
 waiting:{title:'Aguardando aprovação',sub:'Ainda não exportáveis',icon:'…',css:'muted'}
};
const filterDefs=[
 ['attention','Precisam de atenção'],
 ['unrecorded','Sem registro'],
 ['outdated','Desatualizados'],
 ['cancelled','Cancelados'],
 ['recorded','Conferidos'],
 ['waiting','Aguardando'],
 ['all','Todos os eventos']
];
let filter='attention',period='all',query='',busy=false,error='',initialized=false;
const eligible=e=>['Confirmado','Concluído'].includes(e?.st);
function classify(ev){
 if(ev.st==='Cancelado')return manual()?.statusOf(ev)==='cancelled'?'cancelled':null;
 if(eligible(ev)){
  const code=manual()?.statusOf(ev)||'unrecorded';
  return ['recorded','outdated'].includes(code)?code:'unrecorded';
 }
 if(['Pendente','Aguardando aprovação'].includes(ev.st))return 'waiting';
 return null;
}
function summarize(events){
 const result=Object.fromEntries(Object.keys(config).map(k=>[k,0]));
 for(const e of events||[]){const code=classify(e);if(code)result[code]++;}
 result.attention=result.unrecorded+result.outdated+result.cancelled;
 result.all=Object.keys(config).reduce((n,k)=>n+result[k],0);
 return result;
}
function dateOf(ev){
 const d=ev?.d instanceof Date?ev.d:new Date(ev?.d);
 return Number.isFinite(d.getTime())?d:new Date(8640000000000000);
}
function withinPeriod(ev,now=new Date()){
 if(period==='all')return true;
 const date=dateOf(ev),start=new Date(now.getTime()-86400000);
 const end=new Date(now.getTime()+30*86400000);
 return date>=start&&date<=end;
}
function searchHit(ev){
 if(!query.trim())return true;
 return norm([ev.t,ev.loc,ev.requester_name,ev.team].join(' ')).includes(norm(query.trim()));
}
function rows(){
 const all=(B()?.E||[]).filter(ev=>classify(ev)&&withinPeriod(ev)&&searchHit(ev));
 const selected=all.filter(ev=>filter==='all'||(filter==='attention'?['unrecorded','outdated','cancelled'].includes(classify(ev)):classify(ev)===filter));
 const rank={cancelled:0,outdated:1,unrecorded:2,waiting:3,recorded:4};
 return selected.sort((a,b)=>rank[classify(a)]-rank[classify(b)]||dateOf(a)-dateOf(b)||String(a.t).localeCompare(String(b.t),'pt-BR'));
}
const stamp=d=>{
 try{return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(dateOf({d}));}
 catch(_){return 'Horário a conferir';}
};
const statusBadge=code=>'<span class="agenda-control-status agenda-control-'+config[code].css+'">'+esc(config[code].title)+'</span>';
function row(ev){
 const code=classify(ev),rec=manual()?.getRecord?.(ev.id);
 return '<article class="agenda-control-row"><div class="agenda-control-icon agenda-control-'+config[code].css+'" aria-hidden="true">'+esc(config[code].icon)+'</div>'+
 '<div class="agenda-control-rowbody"><div class="agenda-control-rowheading"><strong>'+esc(ev.t)+'</strong>'+statusBadge(code)+'</div>'+
 '<div class="agenda-control-metadata"><span>'+esc(stamp(ev.d))+'</span><span>'+esc(ev.loc||'A definir')+'</span><span>'+esc(ev.st)+'</span></div>'+
 '<p>'+esc(code==='outdated'?'O compromisso foi alterado no HUB; corrija a versão importada no Outlook.':
  code==='cancelled'?'Confira se o compromisso foi excluído do calendário externo.':
  code==='unrecorded'?'Baixe o .ics, importe manualmente e registre a confirmação na ficha.':
  code==='waiting'?'Aguarde a confirmação do gestor antes de exportar.':
  'A equipe declarou a importação. Não é uma confirmação automática do Outlook.')+'</p>'+
 (rec?'<small>Última declaração: '+esc(rec.actor_label||'Equipe')+(rec.calendar_label?' · '+esc(rec.calendar_label):'')+'</small>':'')+
 '</div><button class="btn agenda-control-open" type="button" data-control-open="'+esc(ev.id)+'">Abrir evento</button></article>';
}
function drawRows(){
 const box=document.querySelector('#agenda-control-list');if(!box)return;
 const current=rows(),txt=document.querySelector('#agenda-control-current');
 if(txt)txt.textContent=current.length+' evento(s) neste filtro';
 box.innerHTML=current.length?current.map(row).join(''):
 '<div class="agenda-control-empty"><strong>Nenhum evento neste filtro</strong><p>Altere os filtros ou consulte todos os eventos. O HUB não inventa registros de agenda.</p></div>';
 document.querySelectorAll('[data-control-filter]').forEach(b=>{
  const on=b.dataset.controlFilter===filter;
  b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));
 });
 document.querySelectorAll('[data-control-period]').forEach(b=>{
  const on=b.dataset.controlPeriod===period;
  b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));
 });
}
function tile(code,n){
 const selected=filter===code||(filter==='attention'&&code==='attention');
 const conf=config[code]||{title:'Precisam de atenção',sub:'Pendências operacionais',icon:'!',css:'attention'};
 return '<button type="button" class="agenda-control-tile agenda-control-'+conf.css+(selected?' selected':'')+'" data-control-filter="'+code+'" aria-pressed="'+String(selected)+'">'+
 '<span class="agenda-control-tile-icon" aria-hidden="true">'+esc(conf.icon)+'</span>'+
 '<strong>'+n+'</strong><span>'+esc(conf.title)+'</span><small>'+esc(conf.sub)+'</small></button>';
}
function renderPulse(selector){
 const host=document.querySelector(selector);if(!host)return;
 if(!initialized)queueMicrotask(()=>ensure());
 const cnt=summarize(B()?.E||[]),ready=manual()?.hasLoaded?.()||!live();
 host.innerHTML='<section class="agenda-pulse"><div><span class="hub-kicker">Agenda da equipe · Controle manual</span>'+
 '<h2>'+(!ready?'Consultando pendências…':cnt.attention+' ponto(s) de atenção')+'</h2>'+
 '<p>Eventos sem registro, alterações e cancelamentos que exigem conferência no Outlook.</p></div>'+
 '<div class="agenda-pulse-summary"><span><strong>'+cnt.unrecorded+'</strong> sem registro</span>'+
 '<span><strong>'+cnt.outdated+'</strong> alterados</span>'+
 '<span><strong>'+cnt.cancelled+'</strong> cancelados</span></div>'+
 '<button class="btn pri" type="button" data-go="controle-agenda">Abrir controle da agenda</button></section>';
}
async function ensure(){
 if(initialized||busy||!manual())return;
 initialized=true;busy=true;error='';
 try{await manual().refresh();}
 catch(e){error=e.message||'Consulta indisponível';}
 finally{
  busy=false;
  if(B()?.S?.route==='controle-agenda')render();
  else if(B()?.S?.route==='dashboard')renderPulse('#agenda-pulse');
 }
}
function render(){
 const b=B(),v=document.querySelector('#view');if(!v||b?.S?.route!=='controle-agenda')return;
 if(!initialized)queueMicrotask(()=>ensure());
 const data=(b.E||[]).filter(e=>classify(e)&&withinPeriod(e)&&searchHit(e)),c=summarize(data);
 const done=manual()?.hasLoaded?.()||!live();
 const paint=()=>{v.innerHTML='<div class="agenda-control-page">'+
 '<header class="agenda-control-hero"><div><span class="hub-kicker">DCS / Cerimonial · Acompanhamento operacional</span>'+
 '<h1>Controle da agenda</h1><p>Veja o que ainda precisa de providências antes de apresentar ou conferir os compromissos da equipe.</p></div>'+
 '<div class="agenda-control-hero-actions"><button class="btn" type="button" data-control-refresh'+(busy?' disabled':'')+'>Atualizar registros</button>'+
 '<button class="btn pri" type="button" data-go="agenda">Ver agenda geral</button></div></header>'+
 '<div class="agenda-control-disclaimer">Este painel acompanha <b>declarações manuais feitas no HUB</b>. Não consulta o Outlook, não cria reuniões no Teams e não comprova sincronização.</div>'+
 (error?'<div class="hub-note" role="status">Não foi possível consultar os registros compartilhados: '+esc(error)+'</div>':'')+
 (!done?'<p class="mu">Carregando situação dos eventos…</p>':'')+
 '<div class="agenda-control-stats">'+tile('attention',c.attention)+tile('unrecorded',c.unrecorded)+tile('outdated',c.outdated)+tile('cancelled',c.cancelled)+tile('recorded',c.recorded)+'</div>'+
 '<div class="agenda-control-toolbar"><div><h2>Fila de acompanhamento</h2><p id="agenda-control-current" class="mu">Consulte os filtros abaixo</p></div>'+
 '<label class="agenda-control-search"><span>Buscar evento</span><input class="fi" data-control-search type="search" placeholder="Título, equipe ou local…" value="'+esc(query)+'"></label></div>'+
 '<div class="agenda-control-filters">'+filterDefs.map(([code,label])=>
 '<button type="button" class="agenda-control-chip'+(filter===code?' selected':'')+'" data-control-filter="'+code+'" aria-pressed="'+String(filter===code)+'">'+esc(label)+'</button>').join('')+'</div>'+
 '<div class="agenda-control-period"><span class="mu">Período:</span>'+
 '<button type="button" data-control-period="all" class="'+(period==='all'?'selected':'')+'">Todos</button>'+
 '<button type="button" data-control-period="next" class="'+(period==='next'?'selected':'')+'">Próximos 30 dias</button></div>'+
 '<div id="agenda-control-list" class="agenda-control-list" aria-live="polite"></div>'+
 '<div class="agenda-control-footer"><strong>Como resolver uma pendência?</strong> Abra o evento → Outlook / Teams → baixe o arquivo .ics quando permitido, atualize o Outlook manualmente e registre a confirmação após conferir.</div></div>';
 drawRows();};
 const stability=window.DCS_VIEW_STABILITY;
 if(stability)stability.render(v,stability.key(b.S),paint);
 else{const scroll=v.scrollTop;paint();v.scrollTop=scroll;}
}
document.addEventListener('click',e=>{
 const f=e.target.closest?.('[data-control-filter]');
 if(f){filter=f.dataset.controlFilter;drawRows();return;}
 const p=e.target.closest?.('[data-control-period]');
 if(p){period=p.dataset.controlPeriod;render();return;}
 const op=e.target.closest?.('[data-control-open]');
 if(op){
  B().S.ev=op.dataset.controlOpen;
  B().S.tb='cal';
  if(B().S.route==='eventos')B().rr();
  else window.location.hash='eventos';
  return;
 }
 const reload=e.target.closest?.('[data-control-refresh]');
 if(reload){
  if(busy)return;
  busy=true;reload.disabled=true;
  Promise.resolve().then(async()=>{
   if(live())await window.DCS_BACKEND.reload();
   await manual().refresh();error='';
  }).catch(err=>{error=err.message||'Consulta indisponível';B()?.toast?.('Não foi possível atualizar: '+error);})
  .finally(()=>{busy=false;if(B()?.S?.route==='controle-agenda')render();});
 }
});
document.addEventListener('input',e=>{
 if(e.target.matches?.('[data-control-search]')){
  query=e.target.value;
  drawRows();
 }
});
window.DCS_AGENDA_CONTROL=Object.freeze({classify,summarize,rows,render,renderPulse});
if(B()?.S?.in&&B()?.S?.route==='controle-agenda')queueMicrotask(()=>render());
if(B()?.S?.in&&B()?.S?.route==='dashboard')queueMicrotask(()=>renderPulse('#agenda-pulse'));
})();