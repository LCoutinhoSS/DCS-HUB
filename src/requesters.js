/* DCS HUB v0.8 — Catálogo de solicitantes
 * Fonte parlamentar: https://www.al.sp.gov.br/deputado/dados/ (20ª Legislatura,
 * em exercício em 18/11/2026; NÃO é a lista de eleitos para 2027).
 * Foto, CPF e dados privados não são armazenados.
 */
(function(){
'use strict';
const deputyNames="AGENTE FEDERAL DANILO BALAS|ALEX MADUREIRA|ALTAIR MORAES|ANA CAROLINA SERRA|ANALICE FERNANDES|ANA PERUGINI|ANDRÉA WERNER|ANDRÉ BUENO|ANDRÉ DO PRADO|ATILA JACOMUSSI|BARROS MUNHOZ|BETH SAHÃO|BRUNA FURLAN|BRUNO ZAMBELLI|CAIO FRANÇA|CAPITÃO TELHADA|CARLA MORANDO|CARLÃO PIGNATARI|CARLOS GIANNAZI|CLARICE GANEM|CONTE LOPES|DANI ALONSO|DANIEL SOARES|DELEGADA GRACIELA|DELEGADO OLIM|DIRCEU DALBEN|DONATO|DR. EDUARDO NÓBREGA|DR. ELTON|DR. JORGE DO CARMO|DRA. DAMARIS MOURA|EDIANE MARIA|EDNA MACEDO|EDSON GIRIBONI|EDUARDO SUPLICY|EMÍDIO DE SOUZA|ENIO TATTO|FABIANA BOLSONARO|FÁBIO FARIA DE SÁ|FELIPE FRANCO|GIL DINIZ BOLSONARO|GILMACI SANTOS|GUILHERME CORTEZ|GUTO ZACARIAS|ITAMAR BORGES|JORGE CARUSO|JORGE WILSON XERIFE DO CONSUMIDOR|LECI BRANDÃO|LEONARDO SIQUEIRA|LÉO OLIVEIRA|LETÍCIA AGUIAR|LUCAS BOVE|LUIZ CLAUDIO MARCOLINO|LUIZ FERNANDO T. FERREIRA|MAJOR MECCA|MARCELO AGUIAR|MÁRCIA LIA|MARCIO NAKASHIMA|MARCOS DAMASIO|MARIA LÚCIA AMARY|MARINA HELOU|MARTA COSTA|MAURICI|MAURO BRAGATO|MILTON LEITE FILHO|MONICA SEIXAS DO MOVIMENTO PRETAS|OSEIAS DE MADUREIRA|PAULA DA BANCADA FEMINISTA|PAULO CORREA JR|PAULO FIORILO|PAULO MANSUR|PROFESSORA BEBEL|PROFª CAMILA GODOI|RAFAEL SARAIVA|RAFAEL SILVA|RAFA ZIMBALDI|REIS|RICARDO FRANÇA|RICARDO MADALENA|RODRIGO MORAES|ROGÉRIO NOGUEIRA|ROGÉRIO SANTOS|RÔMULO FERNANDES|RUI ALVES|SEBASTIÃO SANTOS|SOLANGE FREITAS|TENENTE COIMBRA|TEONILIO BARBA|THAINARA FARIA|THIAGO AURICCHIO|TOMÉ ABDUCH|VALDOMIRO LOPES|VALERIA BOLSONARO|VITÃO DO CACHORRÃO";
let cache=null,loading=null,query='',filter='all';
const bridge=()=>window.DCS_BRIDGE;
const real=()=>!!window.DCS_BACKEND?.enabled;
const admin=()=>bridge()?.S?.role==='Administrador';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=()=>deputyNames.split('|').map((name,i)=>({id:'dep-'+String(i+1).padStart(3,'0'),name,kind:'deputado',active:true,source:'ALESP · 20ª Legislatura',created_at:'2026-11-18'}));
function list(){return cache||[];}
function get(id){return list().find(x=>x.id===id);}
function reset(){cache=null;loading=null;}
async function load(force=false){
 if(cache&&!force)return cache;
 if(loading)return loading;
 loading=(async()=>{cache=real()?await window.DCS_BACKEND.listRequesters():base();return cache;})();
 try{return await loading;}finally{loading=null;}
}
function options(selected=''){
 const active=list().filter(x=>x.active||x.id===selected);
 const group=(kind,label)=>'<optgroup label="'+esc(label)+'">'+active.filter(x=>x.kind===kind).map(x=>
 '<option value="'+esc(x.id)+'"'+(x.id===selected?' selected':'')+'>'+esc(x.name)+(x.active?'':' (inativo)')+'</option>').join('')+'</optgroup>';
 return '<option value="">Selecione o solicitante do evento</option>'+
 group('deputado','Deputados estaduais · 20ª Legislatura')+group('setor','Setores e órgãos')+group('outro','Outros solicitantes');
}
function picker(selected=''){
 if(!cache&&!loading)load().then(()=>syncOptions()).catch(e=>bridge()?.toast('Falha ao carregar solicitantes: '+e.message));
 return '<label class="flow-field">Solicitante <span class="required">*</span>'+
 '<select class="fi" name="requester_id" id="requester-select" required>'+options(selected)+'</select></label>'+
 '<small class="mu">Deputados da 20ª Legislatura vigente em novembro/2026. Outros nomes são incluídos pelo Administrador.</small>';
}
function syncOptions(){
 const select=document.querySelector('#requester-select');
 if(!select)return;const old=select.value;select.innerHTML=options(old);select.value=old;
}
function filtered(){
 const q=query.toLocaleLowerCase('pt-BR');
 return list().filter(x=>(filter==='all'||x.kind===filter||filter==='inactive'&&!x.active)&&
 (!q||x.name.toLocaleLowerCase('pt-BR').includes(q)));
}
function paint(){
 const rows=filtered();
 document.querySelector('#view').innerHTML='<div class="admin-shell"><section class="hub-hero"><div class="hub-kicker">Cadastro padronizado</div><div class="hub-head"><div><h1>Solicitantes de eventos</h1><p>Quem solicita é diferente de quem organiza e de quem executa tarefas.</p></div>'+
 (admin()?'<button class="btn pri" data-req-new>+ Adicionar solicitante</button>':'')+'</div></section>'+
 '<div class="hub-stats"><div class="card hub-stat"><small>Total</small><b>'+list().length+'</b></div><div class="card hub-stat"><small>Deputados</small><b>'+list().filter(x=>x.kind==='deputado').length+'</b></div>'+
 '<div class="card hub-stat"><small>Outros solicitantes</small><b>'+list().filter(x=>x.kind!=='deputado').length+'</b></div><div class="card hub-stat"><small>Ativos</small><b>'+list().filter(x=>x.active).length+'</b></div></div>'+
 '<section class="card hub-panel"><div class="hub-filters"><input class="hub-filter hub-query" id="req-search" type="search" placeholder="Buscar parlamentar ou solicitante…" value="'+esc(query)+'">'+
 '<select class="hub-filter" id="req-filter"><option value="all">Todos</option><option value="deputado"'+(filter==='deputado'?' selected':'')+'>Deputados</option><option value="setor"'+(filter==='setor'?' selected':'')+'>Setores</option><option value="outro"'+(filter==='outro'?' selected':'')+'>Outros</option><option value="inactive"'+(filter==='inactive'?' selected':'')+'>Inativos</option></select></div>'+
 '<p class="mu">'+rows.length+' solicitantes encontrados</p><div class="venue-list">'+rows.map(x=>
 '<div class="venue-row"><div><b>'+esc(x.name)+'</b><small>'+esc(x.kind==='deputado'?'Deputado(a) estadual':x.kind==='setor'?'Setor/órgão':'Outro')+' · '+esc(x.source||'Cadastro administrativo')+'</small></div>'+
 '<div class="hub-actions">'+(x.active?'<span class="hub-tag">Ativo</span>':'<span class="hub-tag">Inativo</span>')+
 (admin()?'<button class="btn" data-req-edit="'+esc(x.id)+'">Gerenciar</button>':'')+'</div></div>').join('')+'</div>'+
 '<p class="hub-note">Lista parlamentar: <a href="https://www.al.sp.gov.br/deputado/dados/" target="_blank" rel="noopener noreferrer">portal oficial da ALESP</a>. São deputados da 20ª Legislatura (2023–2027), não os eleitos que tomarão posse em 2027. A lista precisa de revisão periódica.</p></section></div>';
}
async function render(){
 document.querySelector('#view').innerHTML='<section class="card p">Carregando solicitantes…</section>';
 try{await load();if(bridge().S.route==='solicitantes')paint();}
 catch(e){document.querySelector('#view').innerHTML='<section class="card p"><h2>Erro ao carregar solicitantes</h2><p>'+esc(e.message)+'</p></section>';}
}
function edit(id){
 if(!admin())return;
 const old=get(id)||{name:'',kind:'outro',source:'Cadastro administrativo',active:true};
 document.querySelector('#ov').innerHTML='<div class="bk" data-close></div><form class="card md" id="req-form" role="dialog" aria-modal="true" aria-label="Solicitante">'+
 '<h2>'+(id?'Editar solicitante':'Novo solicitante')+'</h2><input type="hidden" name="id" value="'+esc(id||'')+'">'+
 '<label>Nome completo ou denominação<input class="fi" name="name" required maxlength="160" value="'+esc(old.name)+'"></label>'+
 '<label>Tipo<select class="fi" name="kind">'+[['deputado','Deputado(a) estadual'],['setor','Setor/órgão'],['outro','Outro solicitante']].map(([k,l])=>'<option value="'+k+'"'+(k===old.kind?' selected':'')+'>'+l+'</option>').join('')+'</select></label>'+
 '<label>Origem ou referência<input class="fi" name="source" maxlength="160" value="'+esc(old.source||'Cadastro administrativo')+'"></label>'+
 '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="active"'+(old.active?' checked':'')+'> Disponível para novos eventos</label>'+
 '<p class="hub-note">Desativar impede novas seleções, mas mantém o solicitante nos eventos antigos.</p><div class="hub-actions" style="justify-content:flex-end"><button class="btn" type="button" data-close>Cancelar</button><button class="btn pri">Salvar</button></div></form>';
}
async function save(form){
 if(!admin())throw new Error('Acesso restrito');
 const f=new FormData(form),id=f.get('id')||null;
 const name=String(f.get('name')||'').trim().slice(0,160);
 const kind=String(f.get('kind')),source=String(f.get('source')||'').trim().slice(0,160);
 if(name.length<2||!['deputado','setor','outro'].includes(kind))throw new Error('Nome/tipo inválido');
 if(list().some(x=>x.id!==id&&x.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))throw new Error('Já cadastrado');
 const data={name,kind,source:source||'Cadastro administrativo',active:f.has('active')};
 if(real()){if(id)await window.DCS_BACKEND.updateRequester(id,data);else await window.DCS_BACKEND.createRequester(data);await load(true);}
 else if(id)Object.assign(get(id),data);
 else cache.push({id:'extra-'+Date.now(),...data});
 bridge().closeOv();paint();bridge().toast('Solicitante salvo'+(real()?'':' na demonstração'));
}
document.addEventListener('click',e=>{
 if(!bridge()?.S?.in||bridge()?.S?.route!=='solicitantes')return;
 if(e.target.closest('[data-req-new]'))edit(null);
 const row=e.target.closest('[data-req-edit]');if(row)edit(row.dataset.reqEdit);
});
document.addEventListener('input',e=>{if(e.target.id==='req-search'){query=e.target.value;paint();document.querySelector('#req-search')?.focus();}});
document.addEventListener('change',e=>{if(e.target.id==='req-filter'){filter=e.target.value;paint();}});
document.addEventListener('submit',e=>{
 if(e.target.id!=='req-form')return;e.preventDefault();
 const button=e.target.querySelector('[type=submit]');button.disabled=true;
 save(e.target).catch(x=>bridge().toast('Erro: '+x.message)).finally(()=>button.disabled=false);
});
window.DCS_REQUESTERS={load,list,get,picker,options,syncOptions,render,reset,deputyCount:deputyNames.split('|').length};
})();