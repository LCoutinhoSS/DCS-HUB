/* DCS HUB 0.11 — Ficha do gabinete / participantes separados das tarefas.
 * Perguntas selecionadas dos checklists ALESP (não guardar CPF, RG, placas ou segurança).
 */
(function(){
'use strict';
const B=()=>window.DCS_BRIDGE,$=q=>document.querySelector(q);
const live=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Q=(section,key,title,hint='')=>({section,key,title,hint});
const sets={
sessao_solene:[
 Q('Protocolo e mesa','mesa','Quem compõe a mesa?','Registre o resumo aqui e os nomes completos na aba Pessoas e mesa'),
 Q('Protocolo e mesa','disposicao_mesa','No Plenário JK, a mesa terá 3 lugares superiores ou 5 inferiores?'),
 Q('Protocolo e mesa','tribuna_honra','Os assentos da Tribuna de Honra serão utilizados?'),
 Q('Protocolo e mesa','cerimonial_mestre','Quem será o mestre de cerimônias?'),
 Q('Protocolo e mesa','falas_extras','Haverá falas de pessoas que não fazem parte da mesa?'),
 Q('Cerimônia e homenagens','hino','Haverá execução do hino por corpo musical?'),
 Q('Cerimônia e homenagens','homenageados','Quais homenageados foram confirmados?','Registre nome e cargo na aba Pessoas e mesa; não informe RG ou CPF aqui'),
 Q('Cerimônia e homenagens','biografias','As biografias e os currículos foram encaminhados?','Somente confirmação; arquivos devem ficar no SharePoint autorizado'),
 Q('Cerimônia e homenagens','honrarias','Haverá entrega de honraria ou homenagem? Qual?'),
 Q('Cerimônia e homenagens','apresentacoes','Haverá vídeos, apresentações musicais ou institucionais?'),
 Q('Público e infraestrutura','publico','Qual é a expectativa de público?'),
 Q('Público e infraestrutura','mobiliario','Será necessário mobiliário adicional?'),
 Q('Público e infraestrutura','assentos','Haverá reserva de assentos? Para quem?'),
 Q('Público e infraestrutura','buffet','Haverá buffet? Antes ou depois? Em qual local?'),
 Q('Público e infraestrutura','copa','Será necessário serviço de copa para mesa e convidados?'),
 Q('Público e infraestrutura','estacionamento','Será necessário acesso de veículos ou estacionamento especial?','Não registre placas, RG ou CPF aqui'),
 Q('Público e infraestrutura','receptivo','O gabinete disponibilizará equipe de receptivo?'),
 Q('Público e infraestrutura','acessibilidade','Há alguma necessidade de acessibilidade a preparar?','Descreva apenas adaptações do espaço, não condições médicas de pessoas'),
 Q('Público e infraestrutura','sinalizacao','Haverá necessidade de sinalização? Em quais locais?')
],
audiencia_publica:[
 Q('Mesa e participantes','mesa','Quem compõe a mesa? Nome e cargo?','Mantenha nomes na aba Pessoas e mesa'),
 Q('Mesa e participantes','autoridades','Quais autoridades e personalidades estão convidadas?','Registre cada pessoa na aba Pessoas e mesa'),
 Q('Mesa e participantes','grupos','Haverá grupos favoráveis e contrários? Quantos, tempo e alternância?'),
 Q('Mesa e participantes','falas','Como será distribuído o tempo de fala entre mesa, deputados e inscritos?'),
 Q('Inscrições','inscricoes','Como será organizada a lista de inscrições?'),
 Q('Inscrições','horario_inscricao','Qual será o horário de abertura das inscrições?'),
 Q('Infraestrutura','publico','Qual é a expectativa de público?'),
 Q('Infraestrutura','apresentacoes','Haverá vídeos ou apresentação de slides?'),
 Q('Infraestrutura','assentos','Serão reservados assentos para inscritos?'),
 Q('Infraestrutura','copa','Será solicitado serviço de copa?'),
 Q('Infraestrutura','estacionamento','Há necessidade de acesso ou estacionamento institucional?','Não registrar placas ou documentos pessoais'),
 Q('Infraestrutura','sinalizacao','Será necessária sinalização? Onde?'),
 Q('Infraestrutura','buffet','Haverá buffet? Antes ou depois? Local e mobiliário?')
],
cursos_palestras:[
 Q('Programação','mesa','Quem compõe a mesa? Nome completo e cargo?','Registre nomes na aba Pessoas e mesa'),
 Q('Programação','palestrantes','Quais palestrantes foram convidados e quem confirmou?','Registre nomes e situação na aba Pessoas e mesa'),
 Q('Programação','curriculos','Os currículos resumidos dos palestrantes foram recebidos?'),
 Q('Programação','falas','Qual será a duração de fala de cada participante?'),
 Q('Programação','publico','Qual é o público esperado?'),
 Q('Programação','apresentacoes','Haverá vídeos ou apresentações em PowerPoint?'),
 Q('Infraestrutura','receptivo','O gabinete disponibilizará apoio de receptivo?'),
 Q('Infraestrutura','assentos','Haverá reserva de assentos?'),
 Q('Infraestrutura','copa','Haverá necessidade de água e café?'),
 Q('Infraestrutura','estacionamento','Há demanda de estacionamento de convidados?','Sem placa, RG ou CPF neste campo'),
 Q('Infraestrutura','sinalizacao','É necessária sinalização? Locais?'),
 Q('Infraestrutura','buffet','Haverá buffet? Local, horário e mobiliário?')
],
recepcao_autoridades:[
 Q('Comitiva e protocolo','origem','Qual órgão, país ou instituição será representado?'),
 Q('Comitiva e protocolo','visitantes','Quem integra a comitiva e quais são os cargos?','Registre os nomes na aba Pessoas e mesa'),
 Q('Comitiva e protocolo','idioma','Qual idioma será utilizado? É necessário intérprete ou Libras?'),
 Q('Comitiva e protocolo','protocolo','Há exigências de protocolo comunicadas pela assessoria?','Não registrar itinerários ou dados sensíveis de segurança'),
 Q('Comitiva e protocolo','biografia','A assessoria encaminhou biografias e informações públicas?'),
 Q('Comitiva e protocolo','recepcao','Qual local de recepção deverá ser utilizado?'),
 Q('Comitiva e protocolo','percurso','Quais espaços institucionais serão visitados?','Evite horários de deslocamento sensíveis'),
 Q('Cerimônia','livro_honra','Haverá assinatura no livro de honra?'),
 Q('Cerimônia','presente','Haverá entrega de lembrança institucional ou Brecheret?'),
 Q('Infraestrutura','copa','Será necessário serviço de copa?'),
 Q('Infraestrutura','fotografia','A cobertura fotográfica foi solicitada?'),
 Q('Infraestrutura','sinalizacao','Será necessário preparar bandeiras, púlpito ou prismas?')
],
velorio:[
 Q('Organização','familia','Quem é o contato institucional autorizado para alinhamentos com a família?','Não inclua telefone pessoal ou documentos aqui'),
 Q('Organização','funeraria','Há funerária responsável definida?','Somente informação institucional necessária'),
 Q('Organização','publico','O velório será aberto ao público?'),
 Q('Organização','autoridades','Há previsão de recepção de autoridades ou personalidades?','Registre apenas informação confirmada e apropriada'),
 Q('Organização','imprensa','Será necessário espaço para imprensa?'),
 Q('Infraestrutura','coroas','Haverá coroas de flores ou livro de condolências?'),
 Q('Infraestrutura','isolamento','Qual isolamento e fluxo de público são necessários?','Não divulgar medidas detalhadas de segurança'),
 Q('Infraestrutura','copa','Haverá serviço de água/café e sala de descanso?'),
 Q('Infraestrutura','acessibilidade','Quais ajustes de acessibilidade e mobiliário serão necessários?')
],
reuniao:[
 Q('Reunião','pauta','Qual é o objetivo da reunião e quais assuntos devem ser decididos?'),
 Q('Reunião','participantes','Quais setores ou pessoas devem participar?'),
 Q('Reunião','recursos','Quais recursos de sala e audiovisual serão necessários?')
],
exposicao:[
 Q('Exposição','objetivo','Qual é o tema e o objetivo da exposição?'),
 Q('Exposição','montagem','Quais são as necessidades de montagem e desmontagem?'),
 Q('Exposição','responsavel','Quem será o contato responsável pelo material e autorização?')
],
visita_guiada:[
 Q('Visita','grupo','Qual é o grupo e o número estimado de visitantes?'),
 Q('Visita','roteiro','Qual roteiro foi solicitado?'),
 Q('Visita','acessibilidade','Quais recursos de acessibilidade são necessários ao grupo?')
],
comunicacao_visual:[
 Q('Demanda','material','Qual material precisa ser produzido e para qual uso?'),
 Q('Demanda','referencias','Quais referências e especificações foram aprovadas?'),
 Q('Demanda','aprovacao','Quem aprovará a peça e qual é o prazo?')
]};
const statusLabel={pending:'Pendente',to_confirm:'A confirmar',confirmed:'Confirmado',not_applicable:'Não se aplica'};
const presenceLabel={to_confirm:'A confirmar',invited:'Convidado',confirmed:'Confirmado',declined:'Não comparecerá'};
const roles={mesa:'Composição da mesa',fala:'Uso da palavra',homenageado:'Homenageado',palestrante:'Palestrante',convidado:'Convidado',comitiva:'Comitiva',outro:'Outro'};
const data=new Map(), pending=new Map();let directory=null,onlyPending=false;
function reset(){data.clear();pending.clear();directory=null;onlyPending=false;}
function questions(kind){return sets[kind]||sets.reuniao;}
function current(id){return data.get(id)||{answers:[],participants:[]};}
function editable(ev){return B()?.S?.role!=='Leitor'&&!['Concluído','Cancelado'].includes(ev.st);}
function refreshView(id){
 const state=B()?.S;
 if(state?.route==='eventos'&&state.ev===id&&['geral','gabinete','participantes'].includes(state.tb))B().rr();
}
async function ensure(id,force=false){
 if(!live()){
  if(!data.has(id)){
   const ev=B()?.E?.find(e=>e.id===id);
   const demo=(ev?.kind==='sessao_solene'||(!ev?.kind&&ev?.c==='cer'&&String(ev?.t||'').includes('Sessão Solene')));
   if(demo){
    const prepared=[
     ['mesa','Deputado proponente e convidados institucionais: nomes ainda em confirmação','to_confirm'],
     ['publico','Previsão inicial de 150 pessoas, distribuídas entre plenário e galeria','confirmed'],
     ['hino','Execução do Hino Nacional: apresentação solicitada, aguardando retorno','to_confirm'],
     ['receptivo','Equipe do Cerimonial com apoio do gabinete','confirmed'],
     ['apresentacoes','Vídeo institucional curto, aguardando envio para avaliação','to_confirm'],
     ['honrarias','Entrega de homenagem institucional; detalhes a confirmar','to_confirm'],
     ['buffet','Recepção com café; local e horário a confirmar','pending']
    ];
    const answers=prepared.map(([question_key,answer,status])=>({event_id:id,question_key,answer,status,
      updated_by:'demo-cer',updated_at:new Date(Date.now()-3600000).toISOString()}));
    const participants=[
     {id:'demo-mesa-'+id,event_id:id,full_name:'Convidada Exemplo',role_title:'Representante institucional',
      organization:'Organização fictícia',participation:'mesa',invitation_status:'to_confirm',notes:'',
      active:true,authority_id:null},
     {id:'demo-homen-'+id,event_id:id,full_name:'Homenageado Exemplo',role_title:'Homenageado',
      organization:'Demonstração',participation:'homenageado',invitation_status:'confirmed',notes:'',
      active:true,authority_id:null}
    ];
    data.set(id,{answers,participants});
   }else data.set(id,{answers:[],participants:[]});
  }
  return current(id);
 }
 if(data.has(id)&&!force)return current(id);
 if(pending.has(id))return pending.get(id);
 const job=window.DCS_BACKEND.getEventBriefingData(id).then(rows=>{
   data.set(id,rows);refreshView(id);return rows;
 }).finally(()=>pending.delete(id));
 pending.set(id,job);return job;
}
const info=(id)=>{
 if(!data.has(id)&&!pending.has(id))ensure(id).catch(e=>{data.set(id,{answers:[],participants:[],error:e.message});refreshView(id);});
 if(!data.has(id))return '<div class="gab-loading">Carregando informações compartilhadas…</div>';
 if(current(id).error)return '<div class="hub-note">Erro ao consultar: '+esc(current(id).error)+' <button class="btn" data-gab-refresh="'+esc(id)+'">Tentar novamente</button></div>';
 return null;
};
function renderBriefing(ev){
 const waiting=info(ev.id);if(waiting)return waiting;
 const rows=current(ev.id).answers||[],byKey=new Map(rows.map(x=>[x.question_key,x]));
 const qs=questions(ev.kind||'reuniao');
 const answered=qs.filter(q=>byKey.get(q.key)?.status==='confirmed').length;
 const unresolved=qs.filter(q=>!['confirmed','not_applicable'].includes(byKey.get(q.key)?.status)).length;
 const groups=[...new Set(qs.map(q=>q.section))];
 return '<div class="gab-shell"><div class="gab-head"><div><div class="hub-kicker">Informações coletadas com o gabinete</div><h2>Ficha do Gabinete</h2>'+
 '<p>Registre o que foi informado e o que ainda precisa de confirmação. Todas as contas autorizadas do HUB poderão consultar.</p></div>'+
 '<div class="hub-actions"><button class="btn" data-gab-refresh="'+esc(ev.id)+'">Atualizar dados</button>'+
 '<button class="btn'+(onlyPending?' pri':'')+'" data-gab-only-pending>'+ (onlyPending?'Mostrar todas':'Somente pendências')+'</button></div></div>'+
 '<div class="gab-stat-row"><div><b>'+answered+'</b><small>Confirmadas</small></div><div><b>'+unresolved+'</b><small>Pendentes</small></div><div><b>'+qs.length+'</b><small>Perguntas do modelo</small></div></div>'+
 '<div class="gab-progress"><span style="width:'+(qs.length?Math.round(100*answered/qs.length):0)+'%"></span></div>'+
 '<div class="hub-note">**Solicitante** é quem pediu o evento. Pessoas convidadas, autoridades e integrantes da mesa devem ser registradas na aba <button class="btn" data-gab-jump="participantes">Pessoas e mesa</button>. Não inclua RG, CPF, placas ou dados sensíveis nesta ficha.</div>'+
 groups.map((section,i)=>{
   const all=qs.filter(q=>q.section===section);
   const visible=all.filter(q=>!onlyPending||!['confirmed','not_applicable'].includes(byKey.get(q.key)?.status));
   if(!visible.length)return '';
   const done=all.filter(q=>['confirmed','not_applicable'].includes(byKey.get(q.key)?.status)).length;
   return '<details class="gab-group"'+(i===0||onlyPending?' open':'')+'><summary><span>'+esc(section)+'</span><small>'+done+'/'+all.length+' resolvidas</small></summary><div class="gab-questions">'+visible.map(q=>{
     const ans=byKey.get(q.key),st=ans?.status||'pending',textValue=ans?.answer||'';
     const author=ans?.updated_by?(window.DCS_BACKEND?.profileLabel?.(ans.updated_by)||'Equipe'):'';
     return '<div class="gab-question"><div class="gab-question-title"><b>'+esc(q.title)+'</b><span class="gab-status gab-status-'+esc(st)+'">'+esc(statusLabel[st]||st)+'</span></div>'+
      (q.hint?'<p class="gab-hint">'+esc(q.hint)+'</p>':'')+
      (editable(ev)?'<form class="gab-answer-form" data-gab-form><input type="hidden" name="event_id" value="'+esc(ev.id)+'"><input type="hidden" name="question_key" value="'+esc(q.key)+'">'+
       '<textarea class="fi" name="answer" rows="2" maxlength="3000" placeholder="Anote a resposta que o gabinete informou…">'+esc(textValue)+'</textarea>'+
       '<div class="gab-answer-bottom"><select class="fi" name="status" aria-label="Situação da resposta">'+Object.entries(statusLabel).map(([code,label])=>'<option value="'+code+'"'+(code===st?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>'+
       '<small>'+esc(ans?.updated_at?new Date(ans.updated_at).toLocaleString('pt-BR')+' · '+author:'Ainda não preenchido')+'</small><button type="submit" class="btn pri">Salvar resposta</button></div></form>':
       '<p class="gab-read-answer">'+esc(textValue||'Não informado pelo gabinete')+'</p>'+
       (ans?.updated_at?'<small class="mu">Atualizado em '+esc(new Date(ans.updated_at).toLocaleString('pt-BR'))+' · '+esc(author)+'</small>':''))+
       '</div>';
   }).join('')+'</div></details>';
 }).join('')+'</div>';
}
function renderParticipants(ev){
 const waiting=info(ev.id);if(waiting)return waiting;
 const people=(current(ev.id).participants||[]).filter(p=>p.active!==false).sort((a,b)=>{const pa=a.participation==='mesa'?(a.protocol_order||999):1000,pb=b.participation==='mesa'?(b.protocol_order||999):1000;return pa-pb||a.full_name.localeCompare(b.full_name,'pt-BR');});
 const counters=Object.entries(roles).map(([k,v])=>[k,v,people.filter(p=>p.participation===k).length]).filter(x=>x[2]);
 return '<div class="gab-shell"><div class="gab-head"><div><div class="hub-kicker">Pessoas vinculadas ao evento</div><h2>Participantes e composição da mesa</h2>'+
 '<p>Registre nomes e cargos informados pelo gabinete. Uma pessoa pode ser convidada mesmo sem constar no Diretório de Autoridades SP.</p></div>'+
 '<div class="hub-actions"><button class="btn" data-gab-refresh="'+esc(ev.id)+'">Atualizar dados</button>'+
 (editable(ev)?'<button class="btn pri" data-person-add="'+esc(ev.id)+'">+ Adicionar pessoa</button>':'')+'</div></div>'+
 '<div class="hub-note">O <b>Diretório de autoridades</b> serve para consultar ou vincular registros conhecidos. Aqui é onde você informa quem ocupará a mesa, falará, será homenageado ou participará da comitiva. A situação de presença é registrada individualmente.</div>'+
 '<div class="gab-participant-summary">'+(counters.length?counters.map(x=>'<span>'+esc(x[1])+': <b>'+x[2]+'</b></span>').join(''):'<span>Ainda não há participantes cadastrados.</span>')+'</div>'+
 (people.length?'<div class="gab-people">'+people.map(p=>
  '<article class="gab-person"><div><span class="gab-status gab-status-'+esc(p.invitation_status)+'">'+esc(presenceLabel[p.invitation_status]||p.invitation_status)+'</span>'+
  '<h3>'+esc(p.full_name)+'</h3><p>'+esc([p.honorific,p.role_title,p.organization].filter(Boolean).join(' · ')||'Cargo a confirmar')+'</p>'+
  '<small>'+esc(roles[p.participation]||'Participante')+(p.protocol_order?' · Ordem Cerimonial: '+p.protocol_order:' · Ordem pendente')+(p.authority_id?' · Diretório':' · Cadastro no evento')+'</small>'+ (p.represented_for?'<p class="gab-person-note">Neste ato representando: '+esc(p.represented_for)+'</p>':'')+
  (p.notes?'<p class="gab-person-note">'+esc(p.notes)+'</p>':'')+'</div>'+
  (editable(ev)?'<button class="btn" data-person-edit="'+esc(p.id)+'" data-person-event="'+esc(ev.id)+'">Editar</button>':'')+'</article>'
 ).join('')+'</div>':'<section class="gab-empty"><h3>Lista ainda não preenchida</h3><p>Adicione autoridades convidadas, palestrantes, homenageados ou pessoas da mesa. Não é necessário cadastrá-las antes no Autoridades SP.</p></section>')+
 '</div>';
}
async function openPersonForm(eventId,personId){
 const ev=B()?.E?.find(e=>e.id===eventId);if(!ev||!editable(ev))return;
 await ensure(eventId);
 const person=(current(eventId).participants||[]).find(x=>x.id===personId)||null;
 if(live()&&!directory){
  try{directory=await window.DCS_BACKEND.listAuthorities();}
  catch(e){console.warn('[DCS HUB] Diretório indisponível',e);directory=[];}
 }
 const options=(directory||[]).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const inp=(name,label,value,max=180)=>'<label>'+label+'<input class="fi" name="'+name+'" maxlength="'+max+'" value="'+esc(value||'')+'"></label>';
 $('#ov').innerHTML='<div class="bk" data-close></div><form class="card md gab-person-form" id="gab-person-form" role="dialog" aria-modal="true" aria-label="Participante do evento">'+
 '<h2>'+(person?'Editar participação':'Cadastrar participação')+'</h2>'+
 '<input type="hidden" name="event_id" value="'+esc(eventId)+'"><input type="hidden" name="id" value="'+esc(person?.id||'')+'">'+
 '<label>Buscar pessoa no Diretório (opcional)<select class="fi" id="gab-source-authority" name="authority_id"><option value="">Não está no Diretório / preenchimento manual</option>'+
 options.map(x=>'<option value="'+esc(x.id)+'"'+(person?.authority_id===x.id?' selected':'')+'>'+esc(x.name)+' · '+esc(x.role||x.kind)+'</option>').join('')+'</select></label>'+
 '<p class="gab-hint">Ao escolher alguém do Diretório, nome e cargo serão sugeridos. Você pode preencher manualmente, se não estiver cadastrado.</p>'+
 inp('full_name','Nome completo',person?.full_name,200)+
 '<div class="flow-grid">'+inp('role_title','Cargo ou função',person?.role_title)+inp('organization','Órgão ou instituição',person?.organization)+'</div>'+
 '<div class="flow-grid"><label>Participação<select class="fi" name="participation">'+
 Object.entries(roles).map(([k,v])=>'<option value="'+k+'"'+(person?.participation===k?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>'+
 '<label>Situação do convite<select class="fi" name="invitation_status">'+
 Object.entries(presenceLabel).map(([k,v])=>'<option value="'+k+'"'+((person?.invitation_status||'to_confirm')===k?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label></div>'+
 '<div class="hub-note">A ordem protocolar é definida manualmente pelo Cerimonial. Não é calculada pela ordem de cadastro ou pelo Diretório de Autoridades.</div>'+
 '<div class="flow-grid">'+inp('honorific','Tratamento / título (ex.: Senhora Deputada, Doutor)',person?.honorific,110)+
 '<label>Ordem na mesa / nominata<input class="fi" name="protocol_order" type="number" min="1" max="99" value="'+esc(person?.protocol_order||'')+'" placeholder="1, 2, 3…"></label></div>'+
 inp('represented_for','Neste ato representando (opcional)',person?.represented_for,180)+
 '<label>Observações de trabalho (opcional)<textarea class="fi" name="notes" maxlength="1000" rows="2" placeholder="Informações públicas e operacionais">'+esc(person?.notes||'')+'</textarea></label>'+
 '<p class="hub-note">Não informe documentos, dados privados de contato ou detalhes de segurança nesta lista.</p>'+
 '<div class="hub-actions" style="justify-content:flex-end">'+(person?'<button type="button" class="btn" data-person-disable="'+esc(person.id)+'" data-person-event="'+esc(eventId)+'">Retirar da lista</button>':'')+
 '<button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn pri">Salvar</button></div></form>';
}
async function saveAnswer(form){
 const d=new FormData(form),ev=String(d.get('event_id')),key=String(d.get('question_key')),
   answer=String(d.get('answer')||'').trim(),status=String(d.get('status'));
 if(!questions(B().E.find(x=>x.id===ev)?.kind).some(q=>q.key===key))throw Error('Pergunta desconhecida');
 if(answer.length>3000)throw Error('Resposta muito longa');
 if(live())await window.DCS_BACKEND.saveEventBriefingAnswer(ev,key,answer,status);
 else{
  const state=current(ev),rows=state.answers.filter(x=>x.question_key!==key);
  rows.push({event_id:ev,question_key:key,answer,status,updated_by:'demo',updated_at:new Date().toISOString()});
  data.set(ev,{...state,answers:rows});
 }
 if(live())await ensure(ev,true);
 B().rr();B().toast('Resposta salva e disponível para a equipe');
}
async function savePerson(form){
 const d=new FormData(form),ev=String(d.get('event_id')),id=String(d.get('id')),
   obj={authority_id:String(d.get('authority_id')||'')||null,
    full_name:String(d.get('full_name')||'').trim(),
    role_title:String(d.get('role_title')||'').trim(),
    organization:String(d.get('organization')||'').trim(),
    participation:String(d.get('participation')),
    invitation_status:String(d.get('invitation_status')),
    honorific:String(d.get('honorific')||'').trim(),
    protocol_order:String(d.get('protocol_order')||'').trim()?Number(d.get('protocol_order')):null,
    represented_for:String(d.get('represented_for')||'').trim(),
    notes:String(d.get('notes')||'').trim()};
 if(obj.full_name.length<2)throw Error('Informe o nome completo');
 if(obj.protocol_order!==null&&(!Number.isInteger(obj.protocol_order)||obj.protocol_order<1||obj.protocol_order>99))throw Error('A ordem deve ser um número inteiro de 1 a 99');
 if(live()){
  if(id)await window.DCS_BACKEND.updateEventParticipant(id,obj);
  else await window.DCS_BACKEND.createEventParticipant(ev,obj);
  await ensure(ev,true);
 }else{
  const st=current(ev);
  if(id){const old=st.participants.find(p=>p.id===id);if(old)Object.assign(old,obj);}
  else st.participants.push({...obj,id:'demo-person-'+Date.now(),event_id:ev,active:true});
 }
 B().closeOv();B().rr();B().toast('Participante salvo na ficha do evento');
}
document.addEventListener('submit',e=>{
 if(!['gab-answer-form','gab-person-form'].includes(e.target.id)&&!e.target.hasAttribute('data-gab-form'))return;
 e.preventDefault();const frm=e.target,btn=frm.querySelector('[type=submit]');if(btn)btn.disabled=true;
 (frm.id==='gab-person-form'?savePerson(frm):saveAnswer(frm))
 .catch(err=>B()?.toast('Não foi possível salvar: '+err.message))
 .finally(()=>{if(btn?.isConnected)btn.disabled=false;});
});
document.addEventListener('change',e=>{
 if(e.target.id!=='gab-source-authority')return;
 const a=(directory||[]).find(x=>x.id===e.target.value),form=e.target.closest('form');if(!a||!form)return;
 form.elements.namedItem('full_name').value=a.name||'';
 form.elements.namedItem('role_title').value=a.role||'';
 form.elements.namedItem('organization').value=a.org||'';
});
document.addEventListener('click',e=>{
 const x=e.target.closest('[data-gab-refresh]');if(x){data.delete(x.dataset.gabRefresh);ensure(x.dataset.gabRefresh,true).catch(err=>B().toast(err.message));refreshView(x.dataset.gabRefresh);return;}
 const fil=e.target.closest('[data-gab-only-pending]');if(fil){onlyPending=!onlyPending;B().rr();return;}
 const jump=e.target.closest('[data-gab-jump]');if(jump){B().S.tb=jump.dataset.gabJump;B().rr();return;}
 const add=e.target.closest('[data-person-add]');if(add){openPersonForm(add.dataset.personAdd).catch(err=>B().toast(err.message));return;}
 const edit=e.target.closest('[data-person-edit]');if(edit){openPersonForm(edit.dataset.personEvent,edit.dataset.personEdit).catch(err=>B().toast(err.message));return;}
 const off=e.target.closest('[data-person-disable]');if(off){
  if(live())window.DCS_BACKEND.updateEventParticipant(off.dataset.personDisable,{active:false})
   .then(()=>ensure(off.dataset.personEvent,true)).then(()=>{B().closeOv();B().rr();B().toast('Pessoa retirada desta lista')}).catch(err=>B().toast(err.message));
  else{
   const person=(current(off.dataset.personEvent).participants||[]).find(p=>p.id===off.dataset.personDisable);
   if(person)person.active=false;B().closeOv();B().rr();
  }
 }
});
window.DCS_GABINETE={renderBriefing,renderParticipants,questions,ensure,getData(id){if(!live()&&!data.has(id))ensure(id);return data.get(id)||null;},reset};
})();