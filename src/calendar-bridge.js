/* DCS HUB v0.16 · ponte de calendário: exportação local ICS.
 * NÃO é sincronização automática; não cria reunião Teams ou convida participantes.
 */
(function(){
'use strict';
const B=()=>window.DCS_BRIDGE;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eligible=e=>!!e&&['Confirmado','Concluído'].includes(e.st);
const clean=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const encoder=new TextEncoder();
function fold(line){
 let part='',size=0,out=[];
 for(const char of line){
  const bytes=encoder.encode(char).length;
  if(size+bytes>75){out.push(part);part=' '+char;size=1+bytes;}
  else{part+=char;size+=bytes;}
 }
 out.push(part);return out.join('\r\n');
}
function dates(ev){
 const start=ev.d instanceof Date?ev.d:new Date(ev.d);
 if(!Number.isFinite(start.getTime()))throw Error('Data de início inválida');
 const hasEnd=ev.de!==null&&ev.de!==undefined&&ev.de!=='';
 const end=hasEnd?(ev.de instanceof Date?ev.de:new Date(ev.de)):new Date(start.getTime()+3600000);
 if(!Number.isFinite(end.getTime())||end<=start)throw Error('Horário de término inválido');
 return {start,end};
}
function buildIcs(events,now=new Date()){
 const valid=(events||[]).filter(eligible);
 if(!Number.isFinite(now.getTime()))throw Error('Data de exportação inválida');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DCS HUB//Calendario 0.16//PT-BR','CALSCALE:GREGORIAN','X-WR-CALNAME:DCS HUB'];
 for(const e of valid){
  const {start,end}=dates(e);
  const id=String(e.id||'').replace(/[^A-Za-z0-9_-]/g,'_');
  if(!id||!String(e.t||'').trim())throw Error('Evento sem identificador ou título');
  lines.push('BEGIN:VEVENT',
    'UID:'+id+'@dcs-hub.invalid',
    'DTSTAMP:'+utc(now),
    'DTSTART:'+utc(start),
    'DTEND:'+utc(end),
    'SUMMARY:'+clean(e.t),
    'LOCATION:'+clean(e.loc||'A definir'),
    'DESCRIPTION:'+clean('Cópia do evento registrado no DCS HUB. Importação manual; não sincroniza alterações nem reserva espaço.'),
    'STATUS:CONFIRMED',
    'END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return lines.map(fold).join('\r\n')+'\r\n';
}
function filename(label){
 const name=String(label||'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,65)||'evento';
 return 'DCS_HUB_'+name+'.ics';
}
function download(content,name){
 const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
 const link=document.createElement('a');
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
const fmt=d=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
function renderEvent(ev){
 const allowed=eligible(ev);
 let period='';
 try{const {start,end}=dates(ev);period=fmt(start)+' até '+fmt(end)+' (Brasília)';}catch{period='Confira a data e o horário no cadastro';}
 return '<div class="dcs-calendar"><div class="dcs-calendar-head"><div><div class="hub-kicker">Microsoft 365 · Etapa 0.16</div>'+
  '<h2>Adicionar à agenda do Outlook</h2><p>Importe uma cópia dos dados essenciais, sem contatos privados, notas internas ou convidados.</p></div>'+
  '<span class="gab-status gab-status-to_confirm">Sem sincronização automática</span></div>'+
  '<div class="dcs-calendar-info"><div><small>Evento</small><b>'+esc(ev.t)+'</b></div>'+
  '<div><small>Data e horário</small><b>'+esc(period)+'</b></div>'+
  '<div><small>Local</small><b>'+esc(ev.loc||'A definir')+'</b></div>'+
  '<div><small>Situação</small><b>'+esc(ev.st)+'</b></div></div>'+
  (allowed?'<div class="dcs-calendar-actions"><button class="btn pri" type="button" data-calendar-one="'+esc(ev.id)+'">Baixar evento (.ics)</button>'+
   '<a class="btn" href="https://outlook.office.com/calendar/" rel="noopener noreferrer" target="_blank">Abrir Outlook</a></div>':
   '<div class="hub-note">O download individual fica disponível somente após confirmação do evento pelo Gestor. Não será exportado um evento pendente ou cancelado.</div>')+
  '<div class="dcs-calendar-limit"><strong>Importante</strong><p>O arquivo .ics é uma cópia para importar no Outlook e não altera automaticamente a agenda depois de um reagendamento. Ele não cria link de reunião do Teams, não envia convites e não confirma a reserva do espaço da ALESP.</p>'+
  '<p>A conexão direta Microsoft Graph ainda depende de um calendário institucional escolhido, registro de aplicativo e autorização da TI.</p></div></div>';
}
function openAgendaDialog(events,overlay){
 const valid=(events||[]).filter(eligible),count=valid.length;
 overlay('<div class="bk" data-close></div><div class="card md dcs-calendar-dialog" role="dialog" aria-modal="true" aria-label="Exportar agenda para Outlook">'+
  '<h2>Exportar agenda para Outlook</h2>'+
  '<p class="mu">'+count+' evento(s) confirmado(s) ou concluído(s) elegível(is) para importação manual.</p>'+
  '<div class="hub-note">O Outlook pode importar o arquivo .ics em um calendário selecionado. A importação não é sincronização: mudanças posteriores no HUB não atualizam automaticamente o Outlook e podem exigir atualização manual.</div>'+
  '<p>Para abrir no Microsoft 365, use o calendário do Outlook e a opção de adicionar/importar arquivo.</p>'+
  '<div class="dcs-calendar-actions"><button class="btn" data-close>Fechar</button>'+
  '<button class="btn pri" data-calendar-all type="button"'+(count?'':' disabled')+'>Baixar agenda (.ics)</button></div></div>');
}
document.addEventListener('click',e=>{
 const single=e.target.closest?.('[data-calendar-one]');
 const batch=e.target.closest?.('[data-calendar-all]');
 if(!single&&!batch)return;
 e.preventDefault();
 try{
  const events=B()?.E||[];
  const selected=single?events.filter(x=>x.id===single.dataset.calendarOne):events.filter(eligible);
  if(single&&selected.length!==1)throw Error('Evento não encontrado');
  if(!selected.length||selected.some(x=>!eligible(x)))throw Error('Só eventos confirmados ou concluídos podem ser exportados');
  download(buildIcs(selected),filename(single?selected[0].t:'Agenda_confirmada'));
  B()?.toast?.('Arquivo .ics preparado para importação manual no Outlook');
 }catch(err){B()?.toast?.('Não foi possível preparar o calendário: '+err.message);}
});
window.DCS_CALENDAR=Object.freeze({eligible,dates,buildIcs,filename,renderEvent,openAgendaDialog});
})();