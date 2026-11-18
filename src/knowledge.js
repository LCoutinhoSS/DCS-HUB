/* DCS HUB 0.5 — Central de Documentos e Conhecimento
 * Modo demo: somente exemplos em memória. Supabase: apenas com credenciais reais.
 * Nenhum arquivo externo é copiado; não contém integrações Microsoft Graph.
 */
(function(){
'use strict';
const KINDS=[['roteiro','Roteiro'],['nominata','Nominata'],['modelo','Modelo'],['convite','Convite'],['briefing','Briefing'],['referencia','Referência']];
const CATEGORIES=[['geral','Geral'],['cerimonial','Cerimonial'],['exposicoes','Exposições'],['visitas','Visitas guiadas'],['comunicacao','Comunicação visual']];
const LABEL_KIND=Object.fromEntries(KINDS);
const LABEL_CATEGORY=Object.fromEntries(CATEGORIES);
const LABEL_PROVIDER={sharepoint:'SharePoint',onedrive:'OneDrive'};
const state={mode:null,loaded:false,loading:null,docs:[],articles:[],revisions:{},q:'',kind:'all',provider:'all',category:'all',status:'all',error:null,busy:false,seq:10};
const $=(s,r=document)=>r.querySelector(s);
const bridge=()=>window.DCS_BRIDGE;
const isLive=()=>!!(window.DCS_BACKEND&&window.DCS_BACKEND.enabled);
const isEditor=()=>bridge().S.role!=='Leitor';
const isManager=()=>['Gestor','Administrador'].includes(bridge().S.role);
const me=()=>isLive()?window.DCS_BACKEND.currentUserId():'demo-me';
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const now=()=>new Date().toISOString();
const tagList=v=>String(v||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,8).map(x=>x.slice(0,40));
const label=(map,x)=>map[x]||x||'Outro';
const humanDate=x=>x?new Date(x).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'—';
const isOwn=x=>x&&(x.created_by===me()||x.author_id===me());
const canManage=x=>isEditor()&&(isManager()||isOwn(x));
const opts=(arr,val,empty)=> (empty?'<option value="">'+esc(empty)+'</option>':'')+arr.map(([v,l])=>'<option value="'+esc(v)+'"'+(v===val?' selected':'')+'>'+esc(l)+'</option>').join('');
const empty=txt=>'<div class="hub-empty"><strong>Nada por aqui ainda</strong><span>'+esc(txt)+'</span></div>';
const tags=x=>(x||[]).map(t=>'<span class="hub-tag">'+esc(t)+'</span>').join('');
const pill=x=>'<span class="hub-tag">'+esc(x)+'</span>';
const docTitle=x=>'<b class="hub-item-title">'+esc(x.title)+'</b>';
function safeReference(value){
  try{
    const url=new URL(String(value));
    if(url.protocol!=='https:'||url.username||url.password)return null;
    const host=url.hostname.toLowerCase();
    // Links institucionais do SharePoint e do OneDrive; nenhum encurtador genérico.
    if(host==='1drv.ms'||host.endsWith('.sharepoint.com')||host.endsWith('.onedrive.com')||host==='onedrive.live.com')return url.toString();
  }catch(_){}
  return null;
}
// Conteúdo editorial: sem HTML livre para impedir scripts injetados.
function mediaSource(m){
 const s=String(m?.src||m?.url||'');
 if(/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(s)&&s.length<4500000&&!isLive())return s;
 try{const u=new URL(s);if(u.protocol==='https:'&&!u.username&&!u.password)return u.toString();}catch(_){}
 return '';
}
function articleMedia(a){return Array.isArray(a?.media)?a.media.slice(0,6):[];}
function editorialFig(m){
 const src=mediaSource(m);if(!src)return '';
 return '<figure class="editorial-media"><img loading="lazy" src="'+esc(src)+'" alt="'+esc(m.caption||'Fotografia ilustrativa do artigo')+'"><figcaption>'+
 esc(m.caption||'')+(m.credit?' · Foto: '+esc(m.credit):'')+'</figcaption></figure>';
}
function editorialText(body){
 const lines=String(body||'').split(/\n/);let p=[],out=[];
 const flush=()=>{if(p.length){out.push('<p>'+p.join(' ')+'</p>');p=[];}};
 for(const line of lines){
  const t=line.trim();
  if(!t){flush();continue;}
  if(t.startsWith('## ')){flush();out.push('<h2>'+esc(t.slice(3))+'</h2>');continue;}
  if(t.startsWith('### ')){flush();out.push('<h3>'+esc(t.slice(4))+'</h3>');continue;}
  p.push(esc(t).replace(/\*\*(.{1,120}?)\*\*/g,'<strong>$1</strong>'));
 }
 flush();return out.join('');
}
function fileAsImageData(file){
 return new Promise((resolve,reject)=>{
  if(!['image/png','image/jpeg','image/webp'].includes(file?.type)||file.size>2*1024*1024){
   reject(new Error('Na demonstração, cada foto deve ser PNG/JPG/WebP de até 2 MB'));return;
  }
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Falha ao ler a imagem'));
  reader.readAsDataURL(file);
 });
}
function photoInputs(a){
 const existing=articleMedia(a);
 const existingHtml=existing.length?'<p class="editorial-form-hint">Fotos atuais: desmarque as que deseja retirar desta matéria.</p><div class="editorial-image-preview">'+existing.map((m,i)=>{
  const src=mediaSource(m);
  return '<label class="editorial-preview-tile">'+(src?'<img src="'+esc(src)+'" alt="'+esc(m.caption||'Foto atual')+'">':'')+
   '<small><input type="checkbox" name="keep_image" value="'+i+'" checked> Manter foto '+(i+1)+'</small></label>';
 }).join('')+'</div>':'';
 const rows=[0,1,2].map(i=>'<div class="editorial-photo-row"><div class="wide"><b class="editorial-label">Nova imagem '+(i+1)+'</b></div>'+
 '<label class="wide">Arquivo local (JPG, PNG ou WebP)<input type="file" class="fi" name="image_file_'+i+'" accept="image/jpeg,image/png,image/webp"></label>'+
 '<label class="wide">Ou URL HTTPS pública da imagem<input class="fi" type="url" name="image_url_'+i+'" placeholder="https://...imagem.jpg" maxlength="1800"></label>'+
 '<label>Legenda<input class="fi" name="image_caption_'+i+'" maxlength="220" placeholder="Descreva a fotografia"></label>'+
 '<label>Crédito da foto<input class="fi" name="image_credit_'+i+'" maxlength="120" placeholder="Nome do fotógrafo ou setor"></label></div>').join('');
 return '<div class="editorial-image-editor"><b>Fotografias da matéria</b><p>A primeira imagem aparece como capa; as demais formam uma galeria abaixo do texto. Cada foto pode ter legenda e crédito. Máximo de seis imagens por matéria.</p>'+
 existingHtml+'<div class="editorial-photo-rows">'+rows+'</div><p class="editorial-form-hint">'+
 (isLive()?'Os arquivos serão guardados em armazenamento privado do Supabase, após configurar a migração 005.':
 'Fotos locais aparecem somente nesta sessão de demonstração. Não envie fotos reais de servidores ou eventos internos ao site público.')+'</p></div>';
}
function selectedEventName(id){
  if(!id)return 'Sem evento vinculado';
  return bridge().E.find(x=>x.id===id)?.t||'Evento indisponível';
}
function selectedTaskName(id){
  if(!id)return '';
  return bridge().T.find(x=>x.id===id)?.t||'Tarefa indisponível';
}
function demoSeed(){
 const e=bridge().E;
 const event=e.find(x=>x.c==='cer')?.id||null;
 const expo=e.find(x=>x.c==='exp')?.id||null;
 const date=now();
 const d=[
 ['Roteiro de sessão solene — demonstração','roteiro','sharepoint','Estrutura fictícia de roteiro para revisão futura.',event,['EXEMPLO','Cerimonial']],
 ['Nominata de autoridades — demonstração','nominata','onedrive','Documento ilustrativo, sem nomes ou autoridades reais.',event,['EXEMPLO','Protocolo']],
 ['Modelo de convite institucional — demonstração','modelo','sharepoint','Referência fictícia de modelo para convites.',event,['EXEMPLO','Comunicação visual']],
 ['Checklist de exposição — demonstração','modelo','sharepoint','Apenas metadados fictícios, nenhum arquivo anexado.',expo,['EXEMPLO','Exposições']],
 ['Briefing de visita guiada — demonstração','briefing','onedrive','Referência de teste, sem acesso a arquivos externos.',null,['EXEMPLO','Visitas']]
 ];
 state.docs=d.map((x,i)=>({id:'demo-doc-'+i,title:x[0],kind:x[1],provider:x[2],reference_url:null,description:x[3],event_id:x[4],task_id:null,tags:x[5],created_by:'demo-other',created_at:date,updated_at:date}));
 const articleData=[
 ['Primeiros passos na DCS — EXEMPLO','geral','Apresentação ilustrativa do fluxo de trabalho do HUB.','Este conteúdo é demonstrativo.\n\n1. Cadastre uma atividade e vincule o responsável.\n2. O gestor confirma a atividade quando estiver validada.\n3. Registre as tarefas, documentos e etapas.\n\nAntes de usar institucionalmente, substitua este texto por um procedimento oficial aprovado.',['EXEMPLO','Integração']],
 ['Como estruturar um roteiro cerimonial — EXEMPLO','cerimonial','Modelo inicial para uma revisão pela equipe de Cerimonial.','DOCUMENTO DEMONSTRATIVO — NÃO É NORMA DE CERIMONIAL.\n\nDefina o objetivo da atividade, horário, local, autoridades previstas e equipe designada.\n\nPrepare o roteiro, envie para revisão do gestor e arquive o material final no SharePoint, vinculando sua referência ao evento.',['EXEMPLO','Roteiros']],
 ['Fluxo ilustrativo de exposição — EXEMPLO','exposicoes','Etapas de recebimento, montagem e encerramento.','MATERIAL ILUSTRATIVO.\n\nRegistre o período completo de início e término da exposição. A agenda do HUB deve exibir cada dia do intervalo.\n\nAtribua responsáveis pela montagem, atendimento e desmontagem.',['EXEMPLO','Exposições']],
 ['Orientação em revisão — EXEMPLO','visitas','Rascunho fictício que não aparece para leitores.','RASCUNHO DE TREINAMENTO.\n\nEste texto foi criado para simular um artigo ainda não publicado.',['EXEMPLO','Rascunho']]
 ];
 state.articles=articleData.map((x,i)=>({id:'demo-art-'+i,title:x[0],category:x[1],summary:x[2],body:x[3],tags:x[4],status:i===3?'draft':'published',event_id:null,author_id:'demo-other',version:1,media:i===0?[{url:'https://www3.al.sp.gov.br/repositorio/noticia/N-07-2026/fg366742.jpg',caption:'Sede da Assembleia Legislativa do Estado de São Paulo — fotografia pública de referência.',credit:'Agência ALESP (imagem de referência)'}]:[],created_at:date,updated_at:date}));
 state.revisions={};
 state.articles.forEach(x=>{state.revisions[x.id]=[{id:'rev-'+x.id,article_id:x.id,version:1,title:x.title,body:x.body,summary:x.summary,status:x.status,category:x.category,created_at:date}]});
}
function reset(){state.loaded=false;state.loading=null;state.mode=null;state.docs=[];state.articles=[];state.revisions={};state.error=null;}
async function ensureData(){
 const mode=isLive()?'live':'demo';
 if(state.mode!==mode){reset();state.mode=mode;}
 if(state.loaded)return;
 if(state.loading)return state.loading;
 state.loading=(async()=>{
  if(mode==='live'){
   const data=await Promise.all([window.DCS_BACKEND.listDocuments(),window.DCS_BACKEND.listArticles()]);
   state.docs=data[0];state.articles=data[1];
  }else demoSeed();
  state.loaded=true;state.error=null;
 })();
 try{await state.loading;}catch(err){state.error=err.message||'Não foi possível carregar dados';throw err;}
 finally{state.loading=null;}
}
function note(){
 return isLive()
 ?'Índice de referências: os arquivos continuam no SharePoint ou OneDrive e respeitam as permissões Microsoft. Nenhum arquivo foi copiado.'
 :'Prévia pública com exemplos inteiramente fictícios. Não cole links de arquivos internos ou dados pessoais nesta demonstração. As alterações somem ao recarregar.';
}
function stats(arr){return arr.map(([t,v])=>'<div class="card hub-stat"><small>'+esc(t)+'</small><b>'+esc(v)+'</b></div>').join('');}
function hero(what){
 const docs=what==='documents';
 return '<section class="hub-hero"><div class="hub-head"><div><div class="hub-kicker">Acervo institucional · Fase 3</div><h1>'+(docs?'Central de Documentos':'Wiki DCS · Conhecimento')+'</h1><p>'+(docs?'Cada documento no contexto certo: evento, tarefa, categoria e acesso original na Microsoft.':'Procedimentos consultáveis, artigos versionados e memória de trabalho para a Divisão.')+'</p></div>'+
 '<div class="hub-actions"><button class="btn" data-k-nav="'+(docs?'conhecimento':'documentos')+'">'+(docs?'Abrir Wiki DCS':'Ver documentos')+'</button>'+
 (isEditor()?'<button class="btn pri" data-k-add="'+(docs?'doc':'article')+'">+ '+(docs?'Nova referência':'Novo artigo')+'</button>':'')+'</div></div></section>';
}
function cardDoc(d,compact=false){
 const link=safeReference(d.reference_url);
 const typ=label(LABEL_KIND,d.kind);
 const name=label(LABEL_PROVIDER,d.provider);
 const foot='<div class="hub-item-foot"><small>'+(link?'Arquivo externo':'Exemplo sem arquivo')+'</small><div class="hub-actions">'+
 (canManage(d)?'<button class="btn" data-k-edit-doc="'+esc(d.id)+'">Editar</button>':'')+
 (link?'<button class="btn pri" data-k-open-doc="'+esc(d.id)+'">Abrir</button>':'')+
 '</div></div>';
 if(compact)return '<div class="hub-event-item"><div><div class="hub-item-title">'+esc(d.title)+'</div><small>'+esc(typ)+' · '+esc(name)+'</small></div><div class="hub-actions">'+
 (canManage(d)?'<button class="btn" data-k-edit-doc="'+esc(d.id)+'">Editar</button>':'')+
 (link?'<button class="btn pri" data-k-open-doc="'+esc(d.id)+'">Abrir</button>':'')+
 '</div></div>';
 return '<article class="hub-item"><div style="display:flex;justify-content:space-between;gap:9px"><div class="hub-icon">'+(d.kind==='nominata'?'N':d.kind==='roteiro'?'R':d.kind==='modelo'?'M':'F')+'</div>'+pill(name)+'</div><div>'+docTitle(d)+'<p>'+esc(d.description||'Sem descrição')+'</p></div>'+
 '<div class="hub-tags">'+pill(typ)+tags(d.tags)+'</div>'+
 '<small class="mu">'+esc(selectedEventName(d.event_id))+(d.task_id?' · '+esc(selectedTaskName(d.task_id)):'')+'</small>'+foot+'</article>';
}
function cardArticle(a){
 const media=articleMedia(a),source=media.length?mediaSource(media[0]):'';
 const badge=a.status==='published'?'Publicada':'Rascunho';
 return '<article class="hub-item editorial-card">'+
 '<div class="editorial-cover-thumb">'+(source?'<img loading="lazy" src="'+esc(source)+'" alt="'+esc(media[0].caption||'Fotografia de capa')+'">':'<span class="editorial-placeholder">DCS · Revista Interna</span>')+'</div>'+
 '<div class="editorial-card-body"><div class="editorial-meta"><span class="editorial-category">'+esc(label(LABEL_CATEGORY,a.category))+'</span><span>·</span><span>'+esc(humanDate(a.updated_at))+'</span><span>·</span><span>'+esc(badge)+'</span></div>'+
 '<h3>'+esc(a.title)+'</h3><p>'+esc(a.summary||'Clique para ler a matéria completa.')+'</p>'+
 '<div class="editorial-card-footer"><small class="mu">Edição '+Number(a.version||1)+' · '+media.length+' fotografia(s)</small><button class="btn pri" data-k-read="'+esc(a.id)+'">Ler matéria</button></div></div></article>';
}
function visibleArticles(){
 return state.articles.filter(a=>a.status==='published'||isManager()||(isEditor()&&isOwn(a)));
}
function filteredDocs(){
 let q=normalize(state.q);
 return state.docs.filter(d=>(state.kind==='all'||d.kind===state.kind)&&(state.provider==='all'||d.provider===state.provider)&&
 (!q||normalize([d.title,d.description,d.kind,d.provider,selectedEventName(d.event_id),...(d.tags||[])].join(' ')).includes(q)));
}
function filteredArticles(){
 const q=normalize(state.q);
 return visibleArticles().filter(a=>(state.category==='all'||a.category===state.category)&&(state.status==='all'||a.status===state.status)&&
 (!q||normalize([a.title,a.summary,a.body,a.category,...(a.tags||[])].join(' ')).includes(q)));
}
function optionsFilter(list,selected,defaultLabel){
 return '<option value="all">'+esc(defaultLabel)+'</option>'+list.map(([k,t])=>'<option value="'+esc(k)+'"'+(selected===k?' selected':'')+'>'+esc(t)+'</option>').join('');
}
function side(what){
 return '<aside class="hub-aside"><section class="card hub-panel"><h2>Organização do acervo</h2><div class="hub-guide">'+
 '<p><strong>Documentos:</strong> armazene referências a Word, Excel, PowerPoint e PDFs no SharePoint ou OneDrive.</p>'+
 '<p><strong>Contexto:</strong> vincule o item a um evento ou tarefa. Uma mesma atividade mantém tudo reunido.</p>'+
 '<p><strong>Permissões:</strong> o acesso real ao arquivo continua sendo controlado pela Microsoft.</p></div></section>'+
 '<section class="card hub-panel"><h2>Conexões</h2><div class="it"><span>SharePoint / OneDrive</span><span class="s0">Por link</span></div>'+
 '<div class="it"><span>Microsoft Graph</span><span class="s1">Não conectado</span></div>'+
 '<div class="it"><span>Arquivos no HUB</span><span class="s1">Upload futuro</span></div>'+
 '<p class="hub-note">'+esc(note())+'</p></section></aside>';
}
function paintDocs(){
 const a=filteredDocs();
 $('#view').innerHTML='<div class="admin-shell">'+hero('documents')+
 '<div class="hub-stats">'+stats([['Referências',state.docs.length],['Modelos',state.docs.filter(d=>d.kind==='modelo').length],['Vinculadas a eventos',state.docs.filter(d=>d.event_id).length],['Links disponíveis',state.docs.filter(d=>safeReference(d.reference_url)).length]])+'</div>'+
 '<div class="hub-workspace"><section class="card hub-panel"><div class="hd"><div><h2>Biblioteca indexada</h2><p class="mu" style="margin:5px 0 0">Busque documentos e abra o original na Microsoft.</p></div><span class="pill">'+a.length+' itens</span></div>'+
 '<div class="hub-filters"><input class="hub-filter hub-query" id="k-query" type="search" placeholder="Buscar por documento, tag ou evento…" value="'+esc(state.q)+'" aria-label="Pesquisar documentos">'+
 '<select class="hub-filter" id="k-kind" aria-label="Filtrar tipo">'+optionsFilter(KINDS,state.kind,'Todos os tipos')+'</select>'+
 '<select class="hub-filter" id="k-provider" aria-label="Filtrar origem">'+optionsFilter([['sharepoint','SharePoint'],['onedrive','OneDrive']],state.provider,'Todas as origens')+'</select></div>'+
 '<div class="hub-list" id="k-results">'+(a.length?a.map(d=>cardDoc(d)).join(''):empty('Busque outra categoria ou crie uma nova referência.'))+'</div></section>'+side('documents')+'</div></div>';
}
function paintWiki(){
 const articles=visibleArticles();
 const a=filteredArticles();
 $('#view').innerHTML='<div class="admin-shell">'+hero('conhecimento')+
 '<div class="hub-stats">'+stats([['Artigos visíveis',articles.length],['Publicados',articles.filter(x=>x.status==='published').length],['Rascunhos acessíveis',articles.filter(x=>x.status==='draft').length],['Categorias',new Set(articles.map(x=>x.category)).size]])+'</div>'+
 '<div class="hub-workspace"><section class="card hub-panel"><div class="hd"><div><h2>Base de conhecimento</h2><p class="mu" style="margin:5px 0 0">Procedimentos e modelos de orientação com versões.</p></div><span class="pill">'+a.length+' artigos</span></div>'+
 '<div class="hub-filters"><input class="hub-filter hub-query" id="k-query" type="search" placeholder="Pesquisar nos artigos…" value="'+esc(state.q)+'" aria-label="Pesquisar artigos">'+
 '<select class="hub-filter" id="k-category" aria-label="Filtrar categoria">'+optionsFilter(CATEGORIES,state.category,'Todas as áreas')+'</select>'+
 '<select class="hub-filter" id="k-status" aria-label="Filtrar publicação">'+optionsFilter([['published','Publicados'],['draft','Rascunhos']],state.status,'Todos os estados')+'</select></div>'+
 '<div class="hub-list" id="k-results">'+(a.length?a.map(cardArticle).join(''):empty('Não há artigos para este filtro.'))+'</div></section>'+side('conhecimento')+'</div></div>';
}
function loadingPage(){return '<section class="card p"><h2>Carregando acervo…</h2><p class="mu">Consultando os registros autorizados.</p></section>';}
async function render(route){
 $('#view').innerHTML=loadingPage();
 try{await ensureData();}
 catch(e){$('#view').innerHTML='<section class="card st"><h2>Acervo indisponível</h2><p>'+esc(state.error||e.message)+'</p><button class="btn pri" data-k-refresh>Tentar novamente</button></section>';return;}
 if(bridge().S.route!==route)return;
 if(route==='documentos')paintDocs();else paintWiki();
}
function eventDocsHtml(ev){
 if(state.error)return '<p class="mu">Não foi possível carregar os documentos.</p><button class="btn" data-k-refresh>Recarregar</button>';
 if(!state.loaded){
  if(!state.loading)ensureData().then(()=>{if(bridge().S.route==='eventos'&&bridge().S.tb==='docs')bridge().rr();}).catch(()=>{if(bridge().S.route==='eventos'&&bridge().S.tb==='docs')bridge().rr();});
  return '<p class="mu">Carregando documentos do evento…</p>';
 }
 const docs=state.docs.filter(x=>x.event_id===ev.id);
 const articles=visibleArticles().filter(x=>x.event_id===ev.id);
 return '<div class="hd" style="align-items:center;margin:12px 0"><div><h2>Acervo deste evento</h2><p class="mu" style="margin:4px 0 0">Referências e orientações vinculadas à atividade.</p></div>'+
 (isEditor()?'<button class="btn pri" data-k-add-event-doc="'+esc(ev.id)+'">+ Vincular documento</button>':'')+'</div>'+
 '<div class="hub-event-list">'+(docs.length?docs.map(d=>cardDoc(d,true)).join(''):empty('Nenhum documento vinculado a este evento.'))+'</div>'+
 '<h3 style="margin-top:22px">Artigos relacionados</h3>'+
 (articles.length?articles.map(a=>'<div class="hub-event-item"><span><b>'+esc(a.title)+'</b><small style="display:block">'+label(LABEL_CATEGORY,a.category)+'</small></span><button class="btn" data-k-read="'+esc(a.id)+'">Ler artigo</button></div>').join(''):'<p class="mu">Nenhum artigo vinculado.</p>')+
 '<p class="hub-note" style="margin-top:13px">'+esc(note())+'</p>';
}
function modal(title,body){
 $('#ov').innerHTML='<div class="bk" data-close></div><div class="card md hub-drawer" role="dialog" aria-modal="true" aria-label="'+esc(title)+'" style="width:min(590px,94vw)">'+body+'</div>';
 const f=$('#ov input,#ov button');if(f)f.focus();
}
function close(){bridge().closeOv();}
function eventOptions(selected){
 return '<option value="">Sem evento</option>'+bridge().E.map(e=>'<option value="'+esc(e.id)+'"'+(e.id===selected?' selected':'')+'>'+esc(e.t)+'</option>').join('');
}
function taskOptions(selected){
 return '<option value="">Sem tarefa</option>'+bridge().T.map(t=>'<option value="'+esc(t.id)+'"'+(t.id===selected?' selected':'')+'>'+esc(t.t)+'</option>').join('');
}
function openDocForm(id,eventId){
 if(!isEditor()){bridge().toast('Perfil Leitor: acesso somente para consulta');return;}
 const d=state.docs.find(x=>x.id===id);
 if(d&&!canManage(d)){bridge().toast('Sem permissão para modificar esta referência');return;}
 const body='<div class="hub-head"><div><div class="hub-kicker">Referência de arquivo</div><h2 style="font-size:23px">'+(d?'Editar documento':'Nova referência')+'</h2></div><button class="ib" data-close aria-label="Fechar">×</button></div>'+
 '<p class="mu">Os arquivos permanecem na Microsoft. Registre somente links já autorizados para a equipe.</p>'+
 '<form id="k-doc-form" class="hub-form"><input type="hidden" name="id" value="'+esc(d?.id||'')+'">'+
 '<label>Título<input class="fi" name="title" maxlength="200" required value="'+esc(d?.title||'')+'"></label>'+
 '<div class="hub-fields"><label>Tipo<select class="fi" name="kind">'+opts(KINDS,d?.kind||'roteiro')+'</select></label>'+
 '<label>Origem<select class="fi" name="provider">'+opts([['sharepoint','SharePoint'],['onedrive','OneDrive']],d?.provider||'sharepoint')+'</select></label></div>'+
 '<label>Link do arquivo no SharePoint ou OneDrive<input class="fi" name="reference_url" type="url" maxlength="2000" placeholder="https://...sharepoint.com/..." required value="'+esc(d?.reference_url||'')+'"></label>'+
 '<label>Descrição<textarea class="fi" name="description" maxlength="600">'+esc(d?.description||'')+'</textarea></label>'+
 '<div class="hub-fields"><label>Evento vinculado<select class="fi" name="event_id">'+eventOptions(d?.event_id||eventId)+'</select></label>'+
 '<label>Tarefa vinculada<select class="fi" name="task_id">'+taskOptions(d?.task_id)+'</select></label></div>'+
 '<label>Tags (separadas por vírgula)<input class="fi" name="tags" maxlength="320" value="'+esc((d?.tags||[]).join(', '))+'"></label>'+
 '<p class="hub-note">O HUB indexa o link, mas não transfere arquivos nem altera permissões do SharePoint/OneDrive. Use apenas links Microsoft confiáveis.</p>'+
 '<div class="hub-actions" style="justify-content:flex-end;margin-top:15px">'+
 (d?'<button type="button" class="btn" data-k-delete-doc="'+esc(d.id)+'">Excluir referência</button>':'')+
 '<button type="button" class="btn" data-close>Cancelar</button><button class="btn pri" type="submit">Salvar referência</button></div></form>';
 modal('Referência de documento',body);
}
function openArticleForm(id,eventId){
 if(!isEditor()){bridge().toast('Perfil Leitor: somente consulta');return;}
 const a=state.articles.find(x=>x.id===id);
 if(a&&!canManage(a)){bridge().toast('Sem permissão para editar este artigo');return;}
 modal('Editor de artigos','<div class="hub-head"><div><div class="hub-kicker">Base de conhecimento</div><h2 style="font-size:23px">'+(a?'Editar artigo':'Novo artigo')+'</h2></div><button class="ib" data-close aria-label="Fechar">×</button></div>'+
 '<form id="k-article-form" class="hub-form"><input type="hidden" name="id" value="'+esc(a?.id||'')+'">'+
 '<label>Título<input class="fi" name="title" required minlength="3" maxlength="160" value="'+esc(a?.title||'')+'"></label>'+
 '<label>Resumo<input class="fi" name="summary" maxlength="350" value="'+esc(a?.summary||'')+'"></label>'+
 '<div class="hub-fields"><label>Área<select class="fi" name="category">'+opts(CATEGORIES,a?.category||'geral')+'</select></label>'+
 '<label>Situação<select class="fi" name="status">'+opts([['draft','Rascunho'],['published','Publicado']],a?.status||'draft')+'</select></label></div>'+
 '<label>Corpo da matéria (use ## Título de seção e **negrito**)<textarea class="fi hub-long editorial-long" name="body" required minlength="10" maxlength="30000" placeholder="Escreva o texto jornalístico em parágrafos. Use ## para intertítulos.">'+esc(a?.body||'')+'</textarea></label>'+photoInputs(a)+
 '<div class="hub-fields"><label>Vincular evento<select class="fi" name="event_id">'+eventOptions(a?.event_id||eventId)+'</select></label>'+
 '<label>Tags<input class="fi" name="tags" maxlength="320" value="'+esc((a?.tags||[]).join(', '))+'"></label></div>'+
 '<p class="hub-note">Use rascunho enquanto aguarda revisão. A publicação permite a leitura pelos demais servidores autorizados. Alterações criam versões.</p>'+
 '<div class="hub-actions" style="justify-content:flex-end;margin-top:15px">'+(a?'<button type="button" class="btn" data-k-delete-article="'+esc(a.id)+'">Excluir artigo</button>':'')+
 '<button type="button" class="btn" data-close>Cancelar</button><button class="btn pri" type="submit">Salvar artigo</button></div></form>');
}
function showArticle(id){
 location.hash='materia/'+encodeURIComponent(id);
}
async function renderArticlePage(id){
 const root=$('#view');if(!root)return;
 root.innerHTML='<section class="card p">Abrindo matéria…</section>';
 try{await ensureData();}
 catch(e){root.innerHTML='<section class="card p"><h2>Erro na matéria</h2><p>'+esc(e.message)+'</p></section>';return;}
 if(decodeURIComponent(location.hash.slice(8))!==id)return;
 const a=state.articles.find(x=>x.id===id);
 if(!a||(a.status==='draft'&&!isManager()&&!isOwn(a))){
  root.innerHTML='<section class="card p"><button class="btn" data-k-back>← Voltar</button><h2>Matéria indisponível</h2><p>Conteúdo removido ou acesso negado.</p></section>';return;
 }
 const media=articleMedia(a),cover=media[0],src=mediaSource(cover);
 const related=visibleArticles().filter(x=>x.id!==id&&x.category===a.category).slice(0,4);
 const hero='<div class="article-page-hero">'+(src?'<img src="'+esc(src)+'" alt="'+esc(cover.caption||'Foto de capa')+'">':'<div class="article-page-hero-fallback">DCS · Jornal Interno</div>')+'</div>'+
 ((cover?.caption||cover?.credit)?'<div class="article-page-figure-caption">'+esc(cover.caption||'')+(cover.credit?' · Foto: '+esc(cover.credit):'')+'</div>':'');
 root.innerHTML='<div class="article-page-wrap"><div class="article-page-actions"><button class="btn" data-k-back>← Voltar à Wiki DCS</button>'+
 '<div class="hub-actions">'+(canManage(a)?'<button class="btn" data-k-revisions="'+esc(id)+'">Versões</button><button class="btn pri" data-k-edit-article="'+esc(id)+'">Editar matéria</button>':'')+'</div></div>'+
 '<div class="article-layout"><article class="card article-standalone">'+hero+
 '<div class="article-standalone-body"><div class="article-page-kicker">'+esc(label(LABEL_CATEGORY,a.category))+' · '+esc(a.status==='published'?'Publicada':'Rascunho')+'</div>'+
 '<h1>'+esc(a.title)+'</h1><p class="article-page-deck">'+esc(a.summary||'')+'</p>'+
 '<div class="article-page-byline">Redação DCS HUB · '+esc(humanDate(a.updated_at))+' · Versão '+Number(a.version||1)+'</div>'+
 '<div class="article-page-copy">'+editorialText(a.body)+'</div>'+
 '<div class="editorial-media-grid" style="margin:26px 0">'+media.slice(1).map(editorialFig).join('')+'</div>'+
 '<div class="hub-tags" style="margin-top:25px">'+tags(a.tags)+'</div></div></article>'+
 '<aside class="card article-page-aside"><h3>Leia também</h3><p class="mu">Conteúdo da mesma editoria</p><div class="article-page-related">'+
 (related.length?related.map(x=>'<button data-k-read="'+esc(x.id)+'"><b>'+esc(x.title)+'</b><small>'+esc(humanDate(x.updated_at))+'</small></button>').join(''):'<p class="mu">Sem outras matérias.</p>')+
 '</div><p class="hub-note" style="margin-top:18px">Protótipo público com dados fictícios.</p></aside></div></div>';
}
async function showRevisions(id){
 const a=state.articles.find(x=>x.id===id);if(!a||!canManage(a))return;
 let list;
 if(isLive())list=await window.DCS_BACKEND.listArticleRevisions(id);
 else list=state.revisions[id]||[];
 const body=list.slice().sort((x,y)=>y.version-x.version).map(v=>'<button class="hub-revision" data-k-show-revision="'+esc(id)+':'+v.version+'"><b>Versão '+Number(v.version)+'</b> · '+esc(v.status==='published'?'Publicado':'Rascunho')+'<small class="mu" style="display:block">'+humanDate(v.created_at)+'</small></button>').join('');
 state.lastRevisions=list;
 modal('Histórico de versões','<h2>Versões do artigo</h2><p class="mu">'+esc(a.title)+'</p><div class="hub-revisions" style="margin-top:12px">'+(body||empty('Nenhuma versão anterior.'))+'</div><div style="text-align:right;margin-top:13px"><button class="btn" data-close>Fechar</button></div>');
}
function showRevision(key){
 const [id,v]=key.split(':');const row=(state.lastRevisions||[]).find(x=>x.article_id===id&&String(x.version)===v);
 if(!row)return;
 modal('Conteúdo da versão','<div class="hub-kicker">Versão '+Number(row.version)+' · '+esc(row.status)+'</div><h2>'+esc(row.title)+'</h2>'+
 '<div class="hub-article-body" style="margin:15px 0">'+esc(row.body)+'</div><div style="text-align:right"><button class="btn pri" data-close>Fechar</button></div>');
}
function confirmRemove(type,id){
 const entry=(type==='doc'?state.docs:state.articles).find(x=>x.id===id);
 if(!entry||!canManage(entry))return;
 modal('Confirmar exclusão','<h2>Excluir '+(type==='doc'?'referência':'artigo')+'?</h2><p>Este item será removido do índice do DCS HUB: <b>'+esc(entry.title)+'</b>.</p>'+
 '<p class="hub-note">'+(type==='doc'?'O arquivo original continuará no SharePoint ou OneDrive.':'O artigo e o histórico de versões serão excluídos do HUB.')+'</p>'+
 '<div class="hub-actions" style="justify-content:flex-end;margin-top:15px"><button class="btn" data-close>Cancelar</button><button class="btn pri" data-k-confirm-remove="'+type+':'+esc(id)+'">Confirmar exclusão</button></div>');
}
async function act(task){
 if(state.busy)return;
 state.busy=true;
 try{await task();close();if(isLive()){state.loaded=false;await ensureData();}bridge().toast('Alteração salva'+(isLive()?' no banco':' na demonstração'));refreshView();}
 catch(err){bridge().toast('Erro: '+(err?.message||'ação indisponível'));}
 finally{state.busy=false;}
}
function refreshView(){
 const s=bridge().S;
 if(s.route==='documentos')paintDocs();
 else if(s.route==='conhecimento')paintWiki();
 else if(s.route==='eventos')bridge().rr();
}
function saveDocument(form){
 if(!isEditor())return;
 const d=new FormData(form),id=String(d.get('id')||''),title=String(d.get('title')||'').trim();
 const url=safeReference(d.get('reference_url'));
 if(!url){bridge().toast('Use link HTTPS direto do SharePoint ou OneDrive');return;}
 if(!title||title.length>200){bridge().toast('Informe o título (até 200 caracteres)');return;}
 const provider=String(d.get('provider'));if(!LABEL_PROVIDER[provider])return;
 const kind=String(d.get('kind'));if(!LABEL_KIND[kind])return;
 const tagsArr=tagList(d.get('tags'));
 const payload={title,kind,provider,reference_url:url,storage_path:null,description:String(d.get('description')||'').slice(0,600),
 event_id:d.get('event_id')||null,task_id:d.get('task_id')||null,tags:tagsArr};
 const old=state.docs.find(x=>x.id===id);if(old&&!canManage(old))return;
 act(async()=>{
  if(isLive()){
   if(id)await window.DCS_BACKEND.updateDocument(id,payload);
   else await window.DCS_BACKEND.createDocument(payload);
  }else if(old){Object.assign(old,payload,{updated_at:now()});}
  else state.docs.unshift({...payload,id:'demo-doc-new-'+(++state.seq),created_by:'demo-me',created_at:now(),updated_at:now()});
 });
}
function saveArticle(form){
 if(!isEditor())return;
 const d=new FormData(form),id=String(d.get('id')||'');
 const title=String(d.get('title')||'').trim(),body=String(d.get('body')||'').trim();
 if(title.length<3||title.length>160||body.length<10||body.length>30000){
  bridge().toast('Preencha título e texto nos limites indicados');return;
 }
 const category=String(d.get('category')),status=String(d.get('status'));
 if(!LABEL_CATEGORY[category]||!['draft','published'].includes(status))return;
 const old=state.articles.find(x=>x.id===id);
 if(old&&!canManage(old))return;
 const existing=articleMedia(old).filter((m,i)=>d.getAll('keep_image').includes(String(i)))
  .map(m=>({...(m.path?{path:m.path}:{}),...(m.url?{url:m.url}:{}),caption:m.caption||'',credit:m.credit||''}));
 const remote=[],uploads=[];
 for(let i=0;i<3;i++){
  const imageUrl=String(d.get('image_url_'+i)||'').trim();
  const file=d.get('image_file_'+i);
  const caption=String(d.get('image_caption_'+i)||'').trim().slice(0,220);
  const credit=String(d.get('image_credit_'+i)||'').trim().slice(0,120);
  if(file&&file.size>0&&imageUrl){bridge().toast('Escolha arquivo OU URL para cada fotografia');return;}
  if(imageUrl){
   let url;
   try{url=new URL(imageUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error();}
   catch(e){bridge().toast('Use URL HTTPS pública válida para a fotografia '+(i+1));return;}
   remote.push({url:url.toString(),caption,credit});
  }
  if(file&&file.size>0){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>(isLive()?5:2)*1024*1024){
    bridge().toast('Foto '+(i+1)+': JPG, PNG ou WebP de até '+(isLive()?'5':'2')+' MB');return;
   }
   uploads.push({file,caption,credit});
  }
 }
 if(existing.length+remote.length+uploads.length>6){bridge().toast('Máximo de seis imagens por matéria');return;}
 const payload={title,body,category,status,summary:String(d.get('summary')||'').slice(0,350),
 event_id:d.get('event_id')||null,tags:tagList(d.get('tags'))};
 act(async()=>{
  if(isLive()){
   let articleId=id;
   const initialMedia=[...existing,...remote];
   if(articleId){
    await window.DCS_BACKEND.updateArticle(articleId,{...payload,media:initialMedia});
   }else{
    const created=await window.DCS_BACKEND.createArticle({...payload,media:initialMedia});
    articleId=created.id;
   }
   if(uploads.length){
    const files=[];
    for(const item of uploads){
     const saved=await window.DCS_BACKEND.uploadArticlePhoto(articleId,item.file);
     files.push({path:saved.path,caption:item.caption,credit:item.credit});
    }
    await window.DCS_BACKEND.updateArticle(articleId,{media:[...initialMedia,...files]});
   }
  }else{
   const files=[];
   for(const item of uploads){
    files.push({url:await fileAsImageData(item.file),caption:item.caption,credit:item.credit});
   }
   const media=[...existing,...remote,...files];
   let next=old;
   if(!next){
    next={...payload,media,id:'demo-art-new-'+(++state.seq),author_id:'demo-me',version:1,created_at:now(),updated_at:now()};
    state.articles.unshift(next);
   }else Object.assign(next,payload,{media,version:next.version+1,updated_at:now()});
   (state.revisions[next.id]||(state.revisions[next.id]=[])).push({...next,article_id:next.id,created_at:now()});
  }
 });
}
async function remove(type,id){
 const collection=type==='doc'?state.docs:state.articles;
 const entry=collection.find(x=>x.id===id);
 if(!entry||!canManage(entry))return;
 await act(async()=>{
  if(isLive()){
   if(type==='doc')await window.DCS_BACKEND.deleteDocument(id);
   else await window.DCS_BACKEND.deleteArticle(id);
  }else{
   const at=collection.findIndex(x=>x.id===id);
   if(at>=0)collection.splice(at,1);
  }
 });
}
document.addEventListener('click',e=>{
 const node=e.target.closest('[data-k-back],[data-k-nav],[data-k-add],[data-k-add-event-doc],[data-k-edit-doc],[data-k-edit-article],[data-k-open-doc],[data-k-read],[data-k-revisions],[data-k-show-revision],[data-k-delete-doc],[data-k-delete-article],[data-k-confirm-remove],[data-k-refresh]');
 if(!node||!bridge()?.S?.in)return;
 if(node.hasAttribute('data-k-back')){location.hash='conhecimento';return;}
 if(node.dataset.kNav){location.hash=node.dataset.kNav;return;}
 if(node.dataset.kRefresh){state.loaded=false;state.error=null;if(bridge().S.route==='eventos'){ensureData().then(()=>bridge().rr()).catch(err=>bridge().toast('Erro: '+err.message));}else render(bridge().S.route);return;}
 if(node.dataset.kAdd){if(node.dataset.kAdd==='doc')openDocForm(null,null);else openArticleForm(null,null);return;}
 if(node.dataset.kAddEventDoc){openDocForm(null,node.dataset.kAddEventDoc);return;}
 if(node.dataset.kEditDoc){openDocForm(node.dataset.kEditDoc,null);return;}
 if(node.dataset.kEditArticle){openArticleForm(node.dataset.kEditArticle,null);return;}
 if(node.dataset.kOpenDoc){
  const d=state.docs.find(x=>x.id===node.dataset.kOpenDoc);const url=d&&safeReference(d.reference_url);
  if(url)window.open(url,'_blank','noopener,noreferrer');
  else bridge().toast('Esta referência não possui link válido');
  return;
 }
 if(node.dataset.kRead){showArticle(node.dataset.kRead);return;}
 if(node.dataset.kRevisions){showRevisions(node.dataset.kRevisions).catch(err=>bridge().toast('Erro: '+err.message));return;}
 if(node.dataset.kShowRevision){showRevision(node.dataset.kShowRevision);return;}
 if(node.dataset.kDeleteDoc){confirmRemove('doc',node.dataset.kDeleteDoc);return;}
 if(node.dataset.kDeleteArticle){confirmRemove('article',node.dataset.kDeleteArticle);return;}
 if(node.dataset.kConfirmRemove){const [t,id]=node.dataset.kConfirmRemove.split(':');remove(t,id);}
});
document.addEventListener('input',e=>{
 if(e.target.id!=='k-query')return;
 state.q=e.target.value;
 const list=$('#k-results');if(!list)return;
 const route=bridge().S.route,found=route==='documentos'?filteredDocs():filteredArticles();
 list.innerHTML=found.length?found.map(route==='documentos'?d=>cardDoc(d):cardArticle).join(''):empty('Nenhum resultado para esta pesquisa.');
});
document.addEventListener('change',e=>{
 const key={'k-kind':'kind','k-provider':'provider','k-category':'category','k-status':'status'}[e.target.id];
 if(!key)return;
 state[key]=e.target.value;
 const route=bridge().S.route;
 if(route==='documentos')paintDocs();
 else if(route==='conhecimento')paintWiki();
});
document.addEventListener('submit',e=>{
 if(e.target.id==='k-doc-form'){e.preventDefault();saveDocument(e.target);}
 if(e.target.id==='k-article-form'){e.preventDefault();saveArticle(e.target);}
});
window.DCS_KNOWLEDGE={render,renderArticlePage,eventDocsHtml,ensureData,reset};
})();
