/* DCS HUB · Autoridades SP integrado somente em leitura.
   Banco real: public.autoridades; nenhum cadastro duplicado e nenhuma escrita. */
(function(){
'use strict';
let rows=null,error=null,loading=false,search='',kind='all',onlyEmail=false;
const $=q=>document.querySelector(q);
const B=()=>window.DCS_BRIDGE;
const real=()=>!!window.DCS_BACKEND?.enabled;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={deputado_estadual:'Deputados estaduais',vereador:'Vereadores',prefeito:'Prefeitos',secretario_estadual:'Secretários estaduais',secretario_municipal:'Secretários municipais'};
const kindLabel=x=>types[x]||String(x||'Outra autoridade').replace(/_/g,' ');
async function load(force=false){
 if(!real())return [];
 if(rows&&!force)return rows;
 if(loading)return [];
 loading=true;error=null;
 try{rows=await window.DCS_BACKEND.listAuthorities();return rows;}
 catch(e){error=e.message;throw e;}
 finally{loading=false;}
}
function activeRows(){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 return (rows||[]).filter(x=>(kind==='all'||x.kind===kind)&&(!onlyEmail||!!x.email)&&
 (!search||norm([x.name,x.role,x.org,x.city,x.partido].join(' ')).includes(norm(search))));
}
function paint(){
 const root=$('#view');if(!root||B()?.S?.route!=='autoridades')return;
 if(!real()){
  root.innerHTML='<div class="admin-shell"><section class="hub-hero"><div class="hub-kicker">Integração · Catálogo oficial</div><h1>Diretório de autoridades</h1><p>A demonstração pública não lê o banco real. Entre na área de homologação com sua conta autorizada para consultar as autoridades cadastradas.</p></section>'+
  '<section class="card hub-panel"><h2>Uma única base de autoridades</h2><p>Deputados, vereadores e prefeitos existentes no Autoridades SP são consultados em tempo real pelo HUB, sem duplicação nem edição.</p>'+
  '<a class="btn pri" href="homologacao/" rel="noopener">Acessar homologação com login real</a></section></div>';
  return;
 }
 if(error){
  root.innerHTML='<section class="card p"><h2>Não foi possível consultar Autoridades SP</h2><p>'+esc(error)+'</p><button class="btn" data-authorities-refresh>Tentar novamente</button></section>';
  return;
 }
 const list=activeRows();
 const categories=[...new Set((rows||[]).map(x=>x.kind))].sort();
 const option=(v,l)=>'<option value="'+esc(v)+'"'+(v===kind?' selected':'')+'>'+esc(l)+'</option>';
 root.innerHTML='<div class="admin-shell"><section class="hub-hero"><div class="hub-kicker">Integração ativa · Banco compartilhado</div>'+
 '<h1>Diretório de autoridades</h1><p>Use aqui para consultar nomes e cargos do Autoridades SP. Para registrar convidados, homenageados e integrantes da mesa de uma solenidade, abra o evento e escolha <b>Pessoas e mesa</b>. A gestão do diretório continua na aplicação de origem.</p></section>'+
 '<div class="hub-stats"><div class="card hub-stat"><small>Total no catálogo</small><b>'+(rows||[]).length+'</b></div>'+
 '<div class="card hub-stat"><small>Deputados estaduais</small><b>'+(rows||[]).filter(x=>x.kind==='deputado_estadual').length+'</b></div>'+
 '<div class="card hub-stat"><small>Com e-mail informado</small><b>'+(rows||[]).filter(x=>!!x.email).length+'</b></div>'+
 '<div class="card hub-stat"><small>Resultados filtrados</small><b>'+list.length+'</b></div></div>'+
 '<section class="card hub-panel"><div class="hub-filters"><input class="hub-filter hub-query" type="search" id="authorities-search" value="'+esc(search)+'" placeholder="Buscar por nome, partido, órgão ou cidade…" aria-label="Buscar autoridades">'+
 '<select class="hub-filter" id="authorities-kind" aria-label="Filtrar autoridades">'+option('all','Todas as categorias')+categories.map(k=>option(k,kindLabel(k))).join('')+'</select>'+
 '<label class="hub-filter" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="authorities-email"'+(onlyEmail?' checked':'')+'> Com e-mail</label>'+
 '<button class="btn" data-authorities-refresh>Atualizar</button></div>'+
 '<div class="venue-list">'+list.map(x=>'<div class="venue-row"><div><b>'+esc(x.name)+'</b>'+
 '<small>'+esc(kindLabel(x.kind))+(x.role?' · '+esc(x.role):'')+(x.partido?' · '+esc(x.partido):'')+'</small>'+
 '<small>'+esc([x.org,x.city].filter(Boolean).join(' · '))+'</small></div>'+
 '<div class="hub-actions">'+(x.email?'<a href="mailto:'+encodeURIComponent(x.email)+'" style="font-size:12px" title="E-mail cadastrado, não necessariamente verificado">'+esc(x.email)+'</a>':'<span class="mu">E-mail não informado</span>')+
 '</div></div>').join('')+'</div><p class="hub-note">Fonte: tabela public.autoridades do Autoridades SP. A existência de um e-mail no cadastro não comprova que foi verificado. Para corrigir ou cadastrar autoridades, utilize o sistema de origem.</p></section></div>';
}
async function render(){
 const root=$('#view');if(!root)return;
 if(!real()){paint();return;}
 root.innerHTML='<section class="card p"><h2>Consultando Autoridades SP…</h2></section>';
 try{await load();paint();}
 catch(e){paint();}
}
document.addEventListener('input',e=>{
 if(e.target.id!=='authorities-search')return;
 const position=e.target.selectionStart;
 search=e.target.value;paint();
 const field=$('#authorities-search');if(field){field.focus();field.setSelectionRange(position,position);}
});
document.addEventListener('change',e=>{
 if(e.target.id==='authorities-kind'){kind=e.target.value;paint();}
 if(e.target.id==='authorities-email'){onlyEmail=e.target.checked;paint();}
});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-authorities-refresh]')&&B()?.S?.route==='autoridades'){
  rows=null;render();
 }
});
window.DCS_AUTORIDADES={render,load,reset(){rows=null;search='';kind='all';onlyEmail=false;},version:'1.0'};
})();