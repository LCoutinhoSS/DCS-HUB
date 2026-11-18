/* DCS HUB 0.7 — Catálogo ALESP: seleção padronizada, não é reserva
   Fontes: https://www.al.sp.gov.br/institucional/assembleia/plenarios-auditorios/
           https://www.al.sp.gov.br/repositorio/legislacao/ato.da.mesa/2023/ato.da.mesa-24-25.05.2023.html
   No modo DEMO os dados são temporários. */
(function(){
'use strict';
const seed=[
['Plenário Juscelino Kubitschek','Plenário','Secretaria Geral Parlamentar'],
['Plenário José Bonifácio','Plenário','Secretaria Geral Parlamentar'],
['Plenário Tiradentes','Plenário','Secretaria Geral Parlamentar'],
['Plenário Dom Pedro I','Plenário','Secretaria Geral Parlamentar'],
['Auditório Teotônio Vilela','Auditório','Secretaria Geral Parlamentar'],
['Auditório Franco Montoro','Auditório','Secretaria Geral Parlamentar'],
['Auditório Paulo Kobayashi','Auditório','Secretaria Geral Parlamentar'],
['Salão Waldemar Lopes Ferraz (Salão dos Espelhos)','Salão','Presidência'],
['Salão Nobre Campos Machado','Salão','A confirmar com o setor responsável'],
['Hall Nobre 23 de Maio (Hall Monumental)','Espaço cultural','DCS'],
['Café São Paulo','Espaço cultural','DCS'],
['Espaço Heróis de 32','Espaço cultural','A confirmar com o setor responsável'],
['Espaço Cultural V Centenário','Espaço cultural','A confirmar com o setor responsável'],
['Sala de Reunião T42 (Anexo, térreo)','Sala de reunião','DCS'],
['Sala de Reunião T43 (Anexo, térreo)','Sala de reunião','DCS'],
['Sala de Reunião 159 (Anexo, 1º andar)','Sala de reunião','DCS'],
['Sala de Reunião 160 (Anexo, 1º andar)','Sala de reunião','DCS'],
['Sala de Reunião 248 (Anexo, 2º andar)','Sala de reunião','DCS'],
['Sala de Reunião 249 (Anexo, 2º andar)','Sala de reunião','DCS'],
['Estacionamento dos Funcionários (área interna)','Área externa','DCS']
];
let items=null,loading=null,filter='all',q='';
const $=x=>document.querySelector(x),role=()=>window.DCS_BRIDGE?.S?.role;
const isAdmin=()=>role()==='Administrador';
const real=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function reset(){items=null;loading=null;}
function defaults(){return seed.map(([name,kind,authority],i)=>({id:'espaco-'+i,name,kind,authority,active:true,created_at:new Date().toISOString()}));}
async function load(force=false){
 if(items&&!force)return items;
 if(loading)return loading;
 loading=(async()=>{items=real()?await window.DCS_BACKEND.listVenues():defaults();return items;})();
 try{return await loading;}finally{loading=null;}
}
function list(){return items||[];}
function get(id){return list().find(x=>x.id===id);}
function options(selected=''){
 const active=list().filter(x=>x.active||x.id===selected);
 const groups=[...new Set(active.map(x=>x.kind))];
 return '<option value="">Selecione um espaço da ALESP</option>'+groups.map(g=>
  '<optgroup label="'+esc(g)+'">'+active.filter(x=>x.kind===g).map(x=>
   '<option value="'+esc(x.id)+'"'+(selected===x.id?' selected':'')+'>'+esc(x.name)+(x.active?'':' (inativo)')+'</option>').join('')+'</optgroup>'
 ).join('');
}
function fromName(name){return list().find(x=>x.name===name);}
function setSelectorValue(){
 const sel=$('#venue-select');
 if(!sel)return;
 const selected=sel.value;
 sel.innerHTML=options(selected);
 if(selected)sel.value=selected;
}
function selectMarkup(selected=''){
 // Calls are safe before load; submit checks a valid catalog selection.
 if(!items&&!loading)load().then(setSelectorValue).catch(e=>window.DCS_BRIDGE?.toast('Falha ao carregar espaços: '+e.message));
 return '<label>Espaço da ALESP<select id="venue-select" class="fi" name="venue_id" required aria-label="Espaço da ALESP">'+options(selected)+'</select></label><small class="mu" style="display:block;margin:0 0 12px">Escolha padronizada. A seleção não reserva nem autoriza a utilização do espaço.</small>';
}
function editForm(id){
 if(!isAdmin())return;
 const row=get(id)||{id:'',name:'',kind:'Sala de reunião',authority:'A confirmar com o setor responsável',active:true};
 $('#ov').innerHTML='<div class="bk" data-close></div><form class="card md" id="venue-form" role="dialog" aria-modal="true" aria-label="Administrar espaço"><h2>'+(id?'Editar espaço':'Novo espaço')+'</h2>'+
 '<input type="hidden" name="id" value="'+esc(row.id)+'">'+
 '<label>Nome oficial ou padronizado<input class="fi" name="name" maxlength="160" required value="'+esc(row.name)+'"></label>'+
 '<label>Categoria<select class="fi" name="kind">'+['Plenário','Auditório','Salão','Espaço cultural','Sala de reunião','Área externa','Outro'].map(k=>'<option'+(k===row.kind?' selected':'')+'>'+k+'</option>').join('')+'</select></label>'+
 '<label>Unidade de autorização / referência<select class="fi" name="authority">'+['DCS','Secretaria Geral Parlamentar','Presidência','A confirmar com o setor responsável'].map(k=>'<option'+(k===row.authority?' selected':'')+'>'+k+'</option>').join('')+'</select></label>'+
 '<label style="display:flex;align-items:center;gap:9px"><input type="checkbox" name="active"'+(row.active?' checked':'')+'> Espaço disponível no seletor</label>'+
 '<p class="hub-note">Desativar preserva o nome nos eventos antigos. A lista controla nomenclatura, não agendamento nem autorização administrativa.</p>'+
 '<div class="hub-actions" style="justify-content:flex-end;margin-top:15px"><button type="button" class="btn" data-close>Cancelar</button><button class="btn pri" type="submit">Salvar espaço</button></div></form>';
}
async function save(form){
 if(!isAdmin())throw Error('Somente administradores gerenciam espaços');
 const f=new FormData(form),id=String(f.get('id')||''),name=String(f.get('name')||'').trim();
 const kind=String(f.get('kind')||''),authority=String(f.get('authority')||'');
 if(name.length<3||name.length>160)throw Error('Nome deve conter entre 3 e 160 caracteres');
 const other=list().find(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase());
 if(other)throw Error('Este espaço já existe no catálogo');
 const data={name,kind,authority,active:f.has('active')};
 if(real()){
  if(id)await window.DCS_BACKEND.updateVenue(id,data);
  else await window.DCS_BACKEND.createVenue(data);
  await load(true);
 }else if(id){const item=get(id),previous=item.name;Object.assign(item,data);if(previous!==data.name){window.DCS_BRIDGE?.E?.filter(ev=>ev.venue_id===id).forEach(ev=>{ev.loc=data.name;});}}
 else items.push({id:'novo-'+Date.now(),...data,created_at:new Date().toISOString()});
 window.DCS_BRIDGE.closeOv();paint();window.DCS_BRIDGE.toast('Catálogo de espaços atualizado'+(real()?' no banco':' na demonstração'));
}
function paint(){
 const root=$('#view');if(!root)return;
 const active=list().filter(x=>x.active).length;
 const matches=list().filter(x=>(filter==='all'||(filter==='active'&&x.active)||(filter==='inactive'&&!x.active)||(filter===x.kind))&&
 (!q||(x.name+' '+x.kind+' '+x.authority).toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR'))));
 root.innerHTML='<div class="admin-shell"><section class="hub-hero"><div class="hub-head"><div><div class="hub-kicker">Patrimônio · Nomenclatura oficial</div><h1>Espaços da ALESP</h1><p>Um único catálogo para os eventos. Evite erros de digitação e mantenha nomes padronizados.</p></div>'+
 (isAdmin()?'<button class="btn pri" data-v-add>+ Adicionar espaço</button>':'')+'</div></section>'+
 '<div class="hub-stats"><div class="card hub-stat"><small>Espaços cadastrados</small><b>'+list().length+'</b></div><div class="card hub-stat"><small>Ativos</small><b>'+active+'</b></div>'+
 '<div class="card hub-stat"><small>Inativos</small><b>'+(list().length-active)+'</b></div><div class="card hub-stat"><small>Gestão</small><b>'+(isAdmin()?'Admin':'Leitura')+'</b></div></div>'+
 '<section class="card hub-panel"><div class="hub-filters"><input class="hub-filter hub-query" type="search" id="venue-q" placeholder="Pesquisar espaço ou área…" value="'+esc(q)+'">'+
 '<select class="hub-filter" id="venue-filter"><option value="all">Todos</option><option value="active"'+(filter==='active'?' selected':'')+'>Ativos</option><option value="inactive"'+(filter==='inactive'?' selected':'')+'>Inativos</option>'+[...new Set(list().map(x=>x.kind))].map(k=>'<option'+(k===filter?' selected':'')+'>'+esc(k)+'</option>').join('')+'</select></div>'+
 '<div class="venue-list">'+matches.map(x=>'<div class="venue-row"><div><b>'+esc(x.name)+'</b><small>'+esc(x.kind)+' · '+esc(x.authority)+'</small></div><div class="hub-actions"><span class="hub-tag">'+(x.active?'Ativo':'Inativo')+'</span>'+
 (isAdmin()?'<button class="btn" data-v-edit="'+esc(x.id)+'">Gerenciar</button>':'')+'</div></div>').join('')+'</div>'+
 '<p class="hub-note">Nomes e competências iniciais consultados no portal institucional e no Ato da Mesa 24/2023. Verifique a disponibilidade e obtenha a autorização pelo fluxo próprio da ALESP. Fonte: <a href="https://www.al.sp.gov.br/repositorio/legislacao/ato.da.mesa/2023/ato.da.mesa-24-25.05.2023.html" target="_blank" rel="noopener noreferrer">Ato da Mesa nº 24/2023</a>.</p></section></div>';
}
async function render(){
 $('#view').innerHTML='<section class="card p"><h2>Carregando espaços da ALESP…</h2></section>';
 try{await load();if(window.DCS_BRIDGE.S.route==='espacos')paint();}
 catch(e){$('#view').innerHTML='<section class="card p"><h2>Não foi possível carregar os espaços</h2><p>'+esc(e.message)+'</p><button class="btn" data-v-refresh>Tentar novamente</button></section>';}
}
document.addEventListener('click',e=>{
 if(!window.DCS_BRIDGE?.S?.in)return;
 const add=e.target.closest('[data-v-add]'),edit=e.target.closest('[data-v-edit]'),refresh=e.target.closest('[data-v-refresh]');
 if(add){editForm(null);return;}
 if(edit){editForm(edit.dataset.vEdit);return;}
 if(refresh){load(true).then(paint).catch(x=>window.DCS_BRIDGE.toast(x.message));}
});
document.addEventListener('input',e=>{if(e.target.id==='venue-q'){q=e.target.value;paint();$('#venue-q')?.focus();}});
document.addEventListener('change',e=>{if(e.target.id==='venue-filter'){filter=e.target.value;paint();}});
document.addEventListener('submit',e=>{
 if(e.target.id!=='venue-form')return;
 e.preventDefault();
 const button=e.target.querySelector('[type=submit]');button.disabled=true;
 save(e.target).catch(x=>window.DCS_BRIDGE.toast('Erro: '+x.message)).finally(()=>{button.disabled=false;});
});
window.DCS_VENUES={seed,load,list,get,fromName,options,selectMarkup,render,reset};
})();