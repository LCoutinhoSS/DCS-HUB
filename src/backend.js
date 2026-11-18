import { createClient } from '@supabase/supabase-js';
import {ROLE_LABEL,EVENT_STATUS_CODE,TASK_STATUS_CODE,PRIORITY_CODE,eventPeriod,localDatetime,toUiEvent,toUiTask,describeHistory} from './model.js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured=Boolean(url && key && /^https:\/\//.test(url));
const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const $=s=>document.querySelector(s);
const bridge=()=>window.DCS_BRIDGE;
let profile=null;
let profiles=[];
let labelById=new Map();
let idByLabel=new Map();
let notificationPoll=null;

function check(response) {
  if(response.error) throw new Error(response.error.message);
  return response.data;
}
function alertError(e) { console.error('[DCS HUB]',e);bridge().toast('Erro: '+(e?.message||'operação indisponível')); }
function safeRun(task) {Promise.resolve().then(task).catch(alertError);}
function roleLabel(role){return ROLE_LABEL[role]||'Leitor';}
function ensureUser(){if(!profile?.active)throw new Error('Sem perfil ativo autorizado');}

async function getProfile() {
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return null;
  // Os sistemas dividem Auth, mas têm perfis/permissões INDEPENDENTES.
  let row=check(await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle());
  if(!row){
    check(await supabase.rpc('dcs_register_profile'));
    row=check(await supabase.from('profiles').select('*').eq('id',user.id).single());
  }
  if(!row.active){
    // Um administrador já existente do Autoridades SP pode assumir o primeiro
    // posto administrativo do HUB. Não altera sua função no Autoridades SP.
    const claimed=check(await supabase.rpc('dcs_claim_initial_admin'));
    if(claimed)row=check(await supabase.from('profiles').select('*').eq('id',user.id).single());
  }
  if(!row.active)throw new Error('Sua conta do DCS HUB está cadastrada, mas aguarda ativação por um administrador.');
  return row;
}
function labelFor(id){return id ? (labelById.get(id)||'Equipe'):'Equipe';}
function idFor(label){if(label==='Equipe')return null;if(label==='Você')return profile?.id||null;const id=idByLabel.get(label);if(!id)throw new Error('Selecione um responsável válido');return id;}

async function loadAll() {
  ensureUser();
  const q=await Promise.all([
    supabase.from('profiles').select('id,full_name,email,role,active').eq('active',true),
    supabase.from('events').select('*').order('start_at'),
    supabase.from('event_checklist').select('*'),
    supabase.from('tasks').select('*').order('created_at',{ascending:false}),
    supabase.from('event_history').select('*').order('created_at',{ascending:false}).limit(500),
    supabase.from('task_notifications').select('id,task_id,title,created_at,read_at').order('created_at',{ascending:false}).limit(100)
  ]);
  const [people,events,checklist,tasks,history,notifications]=q.map(check);
  profiles=people;
  labelById=new Map();idByLabel=new Map();
  people.forEach(p=>{
    // O ID curto diferencia homônimos; o banco usa sempre o UUID inteiro.
    const label=p.id===profile.id?'Você':`${p.full_name} · ${p.id.slice(0,6)}`;
    labelById.set(p.id,label);idByLabel.set(label,p.id);
  });
  const data=bridge();
  const available=people.filter(p=>p.active && p.role!=='reader' && p.id!==profile.id)
    .map(p=>labelById.get(p.id));
  data.PPL.splice(0,data.PPL.length,'Você',...available,'Equipe');
  const eventMap=new Map(events.map(e=>[e.id,e]));
  data.E.splice(0,data.E.length,...events.map(e=>toUiEvent(e,checklist,history,labelFor)));
  data.T.splice(0,data.T.length,...tasks.map(t=>toUiTask(t,eventMap,labelFor)));
  data.A.splice(0,data.A.length,...history.slice(0,8).map(h=>[describeHistory(h),new Date(h.created_at).toLocaleString('pt-BR')]));
  data.N.splice(0,data.N.length,...notifications.map(n=>({id:n.id,t:n.title,w:new Date(n.created_at).toLocaleString('pt-BR'),u:!n.read_at})));
  data.bell();
  window.DCS_TEAMS?.load().catch(e=>console.warn('[DCS HUB] Não foi possível carregar a equipe:',e));
  window.DCS_REQUESTERS?.load().catch(e=>console.warn('[DCS HUB] Não foi possível carregar solicitantes:',e));
  window.DCS_VENUES?.load().catch(e=>console.warn('[DCS HUB] Não foi possível carregar espaços:',e));
  return {events:events.length,tasks:tasks.length};
}
function enterApp() {
  const ui=bridge();ui.S.role=roleLabel(profile.role);ui.S.in=1;ui.S.first=0;
  $('#ur').textContent=ui.S.role;$('#pf').textContent=ui.S.role;
  const name=$('.me b');if(name)name.textContent=profile.full_name;
  const avatar=$('#av');if(avatar)avatar.textContent=profile.full_name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const note=$('.sb .pl');if(note)note.innerHTML='Banco institucional <b>conectado</b> · <span id="pf">'+ui.S.role+'</span>';
  $('#login').hidden=true;$('#app').hidden=false;ui.route();
  if(notificationPoll)clearInterval(notificationPoll);
  notificationPoll=setInterval(()=>{if(profile?.active)backend.refreshNotifications().catch(console.warn);},30000);
}
function showLogin(){
  const ui=bridge();ui.S.in=0;$('#app').hidden=true;$('#login').hidden=false;
}

export const backend={
  enabled:configured,
  async initialize(){
    if(!configured)return;
    document.documentElement.dataset.authMode='real';
    window.DCS_KNOWLEDGE?.reset();
    window.DCS_VENUES?.reset();
    window.DCS_REQUESTERS?.reset();
    const box=$('#rl')?.closest('label');if(box)box.hidden=true;
    const note=$('.lc .pl');if(note)note.textContent='Acesso real via Supabase Auth. Apenas contas ativadas pela administração podem entrar. Não há seleção de perfil de demonstração.';
    const mail=$('#lf input[type=email]');if(mail)mail.required=true;
    const password=$('#lf input[type=password]');if(password)password.required=true;
    try {
      profile=await getProfile();
      if(profile){await loadAll();enterApp();}
    } catch(e){await supabase.auth.signOut();showLogin();alertError(e);}
  },
  async login(){
    try {
      window.DCS_KNOWLEDGE?.reset();
      const email=$('#lf input[type=email]').value.trim();
      const password=$('#lf input[type=password]').value;
      if(!email||!password)throw new Error('Informe e-mail institucional e senha');
      check(await supabase.auth.signInWithPassword({email,password}));
      profile=await getProfile();
      if(!profile)throw new Error('Usuário não encontrado');
      await loadAll();enterApp();
    }catch(e){await supabase.auth.signOut();profile=null;alertError(e);}
  },
  async logout(){if(notificationPoll)clearInterval(notificationPoll);notificationPoll=null;check(await supabase.auth.signOut());profile=null;profiles=[];labelById=new Map();idByLabel=new Map();window.DCS_KNOWLEDGE?.reset();window.DCS_VENUES?.reset();window.DCS_REQUESTERS?.reset();bridge().E.splice(0);bridge().T.splice(0);bridge().N.splice(0);showLogin();bridge().toast('Sessão encerrada');},
  async reload(){await loadAll();bridge().refresh();},
  async createEvent(form){
    ensureUser();
    const dates=eventPeriod(form.get('d'),form.get('h'),form.get('e'));
    const name=String(form.get('t')||'').trim();if(!name)throw new Error('Título obrigatório');
    check(await supabase.from('events').insert({
      title:name,category:form.get('c'),location:window.DCS_VENUES?.get(form.get('venue_id'))?.name||'',
      ...dates,venue_id:form.get('venue_id'),created_by:profile.id,owner_id:profile.id,status:'pending'
    }).select('id').single());
    bridge().closeOv();await this.reload();bridge().toast('Atividade pendente criada no banco');
  },
  async approve(id){
    ensureUser();const n=check(await supabase.rpc('approve_event',{p_event_id:id}));
    bridge().closeOv();await this.reload();bridge().toast(`Atividade confirmada. ${n} tarefa(s) criada(s) sem duplicação.`);
  },
  async changeEventStatus(id,statusLabel){
    const status=EVENT_STATUS_CODE[statusLabel];if(!['completed','canceled'].includes(status))throw new Error('Status inválido');
    check(await supabase.from('events').update({status}).eq('id',id).select('id').single());
    bridge().closeOv();await this.reload();bridge().toast('Evento atualizado');
  },
  async toggleChecklist(eventId,index,drawer=false){
    const ev=bridge().E.find(e=>e.id===eventId);const item=ev?.chk[index];
    if(!item)throw new Error('Checklist não encontrado');
    check(await supabase.from('event_checklist').update({completed:!item.d}).eq('id',item.id).select('id').single());
    await this.reload();if(drawer)bridge().openEv(eventId);else bridge().rr();
  },
  async createTask(form){
    ensureUser();
    const label=form.get('w');const eventId=form.get('v')||null;
    check(await supabase.from('tasks').insert({
      title:String(form.get('t')||'').trim(),event_id:eventId,
      assignee_id:idFor(label),team:form.get('team'),created_by:profile.id,due_at:form.get('d'),
      priority:PRIORITY_CODE[form.get('p')]||'medium',status:'pending'
    }).select('id').single());
    bridge().closeOv();await this.reload();bridge().toast('Tarefa cadastrada e atribuída no banco');
  },
  async assignTask(id,label){
    const team=window.DCS_TEAMS?.getTeam(label);
    check(await supabase.from('tasks').update({assignee_id:idFor(label),...(team?{team}:{})}).eq('id',id).select('id').single());
    await this.reload();bridge().rr();bridge().toast('Responsável atualizado');
  },
  async taskStatus(id,label){
    const status=TASK_STATUS_CODE[label];if(!status)throw new Error('Status inválido');
    check(await supabase.from('tasks').update({status}).eq('id',id).select('id').single());
    await this.reload();bridge().rr();bridge().toast('Status da tarefa atualizado');
  },
  async reschedule(form,id){
    const uiEvent=bridge().E.find(e=>e.id===id);if(!uiEvent)throw new Error('Evento não encontrado');
    const newStart=localDatetime(form.get('d'),form.get('h'));
    const diff=newStart-uiEvent.d;
    const newEnd=new Date(uiEvent.de.getTime()+diff);
    check(await supabase.rpc('reschedule_event',{
      p_event_id:id,p_start_at:newStart.toISOString(),p_end_at:newEnd.toISOString(),p_reason:form.get('m')||''
    }));
    bridge().closeOv();await this.reload();bridge().toast('Período reagendado e registrado no histórico');
  },
  async listDocuments(){
    ensureUser();
    return check(await supabase.from('documents')
      .select('id,title,kind,provider,reference_url,description,tags,event_id,task_id,created_by,created_at,updated_at')
      .order('updated_at',{ascending:false}));
  },
  async createDocument(data){
    ensureUser();
    return check(await supabase.from('documents').insert(data).select('id').single());
  },
  async updateDocument(id,data){
    ensureUser();
    return check(await supabase.from('documents').update(data).eq('id',id).select('id').single());
  },
  async deleteDocument(id){
    ensureUser();
    return check(await supabase.from('documents').delete().eq('id',id).select('id').single());
  },
  async listArticles(){
    ensureUser();
    const items=check(await supabase.from('knowledge_articles')
      .select('id,title,summary,body,category,status,tags,event_id,author_id,version,media,created_at,updated_at')
      .order('updated_at',{ascending:false}));
    return await Promise.all(items.map(async article=>({
      ...article,media:await Promise.all((article.media||[]).map(async m=>{
        if(!m.path)return m;
        const {data,error}=await supabase.storage.from('dcs-editorial').createSignedUrl(m.path,3600);
        return {...m,src:error?'':data.signedUrl};
      }))
    })));
  },
  async createArticle(data){
    ensureUser();
    return check(await supabase.from('knowledge_articles').insert(data).select('id').single());
  },
  async updateArticle(id,data){
    ensureUser();
    return check(await supabase.from('knowledge_articles').update(data).eq('id',id).select('id').single());
  },
  async deleteArticle(id){
    ensureUser();
    return check(await supabase.from('knowledge_articles').delete().eq('id',id).select('id').single());
  },
  async listArticleRevisions(id){
    ensureUser();
    return check(await supabase.from('knowledge_article_revisions')
      .select('id,article_id,version,title,summary,body,category,status,media,created_at')
      .eq('article_id',id).order('version',{ascending:false}));
  },
  async listAuthorities(){
    ensureUser();
    // Fonte única: tabela Autoridades SP. Consulta somente leitura.
    return check(await supabase.from('autoridades')
      .select('id,name,kind,role,org,city,partido,email,status_verificacao,updated_at')
      .order('name',{ascending:true}).limit(1000));
  },
  async listRequesters(){
    ensureUser();
    // Autoridades SP é a fonte única dos deputados em exercício.
    // Não se copiam nem alteram registros de public.autoridades.
    const [master,custom]=await Promise.all([
      supabase.from('autoridades').select('id,name,kind,updated_at').eq('kind','deputado_estadual').order('name'),
      supabase.from('event_requesters').select('id,name,kind,source,active,created_at,updated_at').order('name')
    ]);
    const deputies=check(master).map(a=>({
      id:'a:'+a.id,name:a.name,kind:'deputado',source:'Autoridades SP · cadastro oficial',
      active:true,updated_at:a.updated_at,linked_authority_id:a.id
    }));
    const added=check(custom).map(r=>({...r,id:'c:'+r.id}));
    return [...deputies,...added].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  },
  async createRequester(data){
    ensureUser();
    if(profile.role!=='admin')throw new Error('Somente administrador gerencia solicitantes');
    return check(await supabase.from('event_requesters').insert(data).select('id').single());
  },
  async updateRequester(id,data){
    ensureUser();
    if(profile.role!=='admin')throw new Error('Somente administrador gerencia solicitantes');
    if(!id.startsWith('c:'))throw new Error('Deputados são mantidos pelo Autoridades SP, não pelo DCS HUB');
    return check(await supabase.from('event_requesters').update(data).eq('id',id.slice(2)).select('id').single());
  },
  async delegateChecklistItem(eventId,index,label,team,due){
    ensureUser();
    const ev=bridge().E.find(x=>x.id===eventId),item=ev?.chk[index];
    if(!item?.id)throw new Error('Etapa não encontrada');
    check(await supabase.rpc('delegate_event_checklist',{
      p_checklist:item.id,p_assignee:idFor(label),p_team:team,p_due:due||null
    }));
    await this.reload();bridge().rr();bridge().toast('Responsável da etapa atualizado');
  },
  async updateMeetingBriefing(eventId,patch){
    ensureUser();
    const ev=bridge().E.find(x=>x.id===eventId);
    if(!ev||ev.kind!=='reuniao')throw new Error('Reunião não encontrada');
    if(!['admin','manager'].includes(profile.role)&&ev.createdBy!==profile.id)
      throw new Error('Sem permissão para editar a pauta');
    const allowed=['purpose','agenda_text','attendees','meeting_format','duration_min','minutes_owner','resources','decisions'];
    const filtered=Object.fromEntries(allowed.filter(k=>Object.hasOwn(patch,k)).map(k=>[k,patch[k]]));
    check(await supabase.from('events').update({briefing:{...ev.briefing,...filtered}})
      .eq('id',eventId).select('id').single());
    await this.reload();bridge().rr();bridge().toast('Ficha da reunião atualizada');
  },
  async createFlowEvent(data){
    ensureUser();
    const kindInfo=window.DCS_CHECKLISTS?.find(data.kind);
    if(!kindInfo||kindInfo[2]!==data.category)throw new Error('Tipo de evento não reconhecido');
    const start=localDatetime(data.start_date,data.start_time);
    const end=localDatetime(data.end_date,data.end_time);
    if(end<=start)throw new Error('O horário final precisa ser posterior ao início');
    const checklist=data.tasks.map(t=>({
      title:t.title,section:t.section,applicable:t.applicable,team:t.team,
      assignee_id:idFor(t.assignee_label),due_at:t.due_at||null,priority:t.priority||'medium'
    }));
    const eventId=check(await supabase.rpc('create_planned_event',{
      p_title:data.title,p_kind:data.kind,p_category:data.category,
      p_requester:data.requester_id,p_venue:data.venue_id,p_team:data.team,
      p_start:start.toISOString(),p_end:end.toISOString(),
      p_briefing:data.briefing,p_items:checklist
    }));
    await this.reload();
    bridge().toast('Evento planejado. As tarefas do modelo serão enviadas após confirmação do gestor.');
    return eventId;
  },
  async listVenues(){
    ensureUser();
    return check(await supabase.from('venues').select('id,name,kind,authority,active,created_at,updated_at').order('name'));
  },
  async createVenue(data){
    ensureUser();
    return check(await supabase.from('venues').insert(data).select('id').single());
  },
  async updateVenue(id,data){
    ensureUser();
    return check(await supabase.from('venues').update(data).eq('id',id).select('id').single());
  },
  async listTeamProfiles(){
    ensureUser();
    const rows=check(await supabase.from('profiles').select('id,full_name,department,role,active').eq('active',true));
    return rows.map(p=>({...p,label:p.id===profile.id?'Você':(labelById.get(p.id)||p.full_name+' · '+p.id.slice(0,6))}));
  },
  async refreshNotifications(){
    if(!profile?.active)return;
    const items=check(await supabase.from('task_notifications').select('id,title,created_at,read_at').order('created_at',{ascending:false}).limit(100));
    const ui=bridge();
    ui.N.splice(0,ui.N.length,...items.map(n=>({id:n.id,t:n.title,w:new Date(n.created_at).toLocaleString('pt-BR'),u:!n.read_at})));
    ui.bell();
  },
  async markNotificationsRead(){
    ensureUser();
    check(await supabase.from('task_notifications').update({read_at:new Date().toISOString()}).is('read_at',null).select('id'));
    await this.refreshNotifications();
  },
  async uploadArticlePhoto(articleId,file){
    ensureUser();
    if(!['image/png','image/jpeg','image/webp'].includes(file?.type)||file.size>5*1024*1024)throw new Error('Foto deve ser PNG, JPG ou WebP de até 5 MB');
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=profile.id+'/'+articleId+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await supabase.storage.from('dcs-editorial').upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw new Error('Não foi possível armazenar a foto: '+error.message);
    const {data}=await supabase.storage.from('dcs-editorial').createSignedUrl(path,3600);
    return {path,src:data?.signedUrl||'',caption:'',credit:''};
  },
  currentUserId(){return profile?.id||null;},
  async listAdminProfiles(){
    if(!profile?.active||profile.role!=='admin')throw new Error('Acesso restrito ao Administrador');
    return check(await supabase.from('profiles')
      .select('id,full_name,email,role,department,active,created_at')
      .order('full_name',{ascending:true}));
  },
  async listAdminAudit(){
    if(!profile?.active||profile.role!=='admin')throw new Error('Acesso restrito ao Administrador');
    return check(await supabase.from('profile_admin_audit')
      .select('id,actor_id,target_name,old_role,new_role,old_active,new_active,created_at')
      .order('created_at',{ascending:false}).limit(40));
  },
  async updateAdminProfile(data){
    if(!profile?.active||profile.role!=='admin')throw new Error('Acesso restrito ao Administrador');
    if(data.id===profile.id)throw new Error('Não é permitido modificar o próprio perfil');
    return check(await supabase.rpc('admin_update_profile',{
      p_profile_id:data.id,
      p_full_name:data.full_name,
      p_role:data.role,
      p_department:data.department,
      p_active:data.active
    }));
  },
  canReschedule(e){return profile?.role==='admin'||profile?.role==='manager'||(e.createdBy===profile?.id && e.st==='Pendente');},
  error:alertError,
  run:safeRun
};

window.DCS_BACKEND=backend;
backend.initialize();
