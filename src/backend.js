import { createClient } from '@supabase/supabase-js';
import {ROLE_LABEL,EVENT_STATUS_CODE,TASK_STATUS_CODE,PRIORITY_CODE,eventPeriod,localDatetime,toUiEvent,toUiTask,describeHistory} from './model.js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured=Boolean(url && key && /^https:\/\//.test(url));
const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const $=s=>document.querySelector(s);
const bridge=()=>window.DCS_BRIDGE;
let profile=null;
let profiles=[];
let labelById=new Map();
let idByLabel=new Map();

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
  const row=check(await supabase.from('profiles').select('*').eq('id',user.id).single());
  if(!row.active)throw new Error('Seu cadastro existe, mas aguarda ativação por um administrador.');
  return row;
}
function labelFor(id){return id ? (labelById.get(id)||'Equipe'):'Equipe';}
function idFor(label){if(label==='Equipe')return null;const id=idByLabel.get(label);if(!id)throw new Error('Selecione um responsável válido');return id;}

async function loadAll() {
  ensureUser();
  const q=await Promise.all([
    supabase.from('profiles').select('id,full_name,email,role,active').eq('active',true),
    supabase.from('events').select('*').order('start_at'),
    supabase.from('event_checklist').select('*'),
    supabase.from('tasks').select('*').order('created_at',{ascending:false}),
    supabase.from('event_history').select('*').order('created_at',{ascending:false}).limit(500)
  ]);
  const [people,events,checklist,tasks,history]=q.map(check);
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
  data.N.splice(0,data.N.length); // Nunca exibir notificações fictícias no modo real.
  data.bell();
  return {events:events.length,tasks:tasks.length};
}
function enterApp() {
  const ui=bridge();ui.S.role=roleLabel(profile.role);ui.S.in=1;ui.S.first=0;
  $('#ur').textContent=ui.S.role;$('#pf').textContent=ui.S.role;
  const name=$('.me b');if(name)name.textContent=profile.full_name;
  const avatar=$('#av');if(avatar)avatar.textContent=profile.full_name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const note=$('.sb .pl');if(note)note.innerHTML='Banco institucional <b>conectado</b> · <span id="pf">'+ui.S.role+'</span>';
  $('#login').hidden=true;$('#app').hidden=false;ui.route();
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
  async logout(){check(await supabase.auth.signOut());profile=null;window.DCS_KNOWLEDGE?.reset();showLogin();bridge().toast('Sessão encerrada');},
  async reload(){await loadAll();bridge().refresh();},
  async createEvent(form){
    ensureUser();
    const dates=eventPeriod(form.get('d'),form.get('h'),form.get('e'));
    const name=String(form.get('t')||'').trim();if(!name)throw new Error('Título obrigatório');
    check(await supabase.from('events').insert({
      title:name,category:form.get('c'),location:String(form.get('l')||'').trim()||'A definir',
      ...dates,created_by:profile.id,owner_id:profile.id,status:'pending'
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
      assignee_id:idFor(label),created_by:profile.id,due_at:form.get('d'),
      priority:PRIORITY_CODE[form.get('p')]||'medium',status:'pending'
    }).select('id').single());
    bridge().closeOv();await this.reload();bridge().toast('Tarefa cadastrada e atribuída no banco');
  },
  async assignTask(id,label){
    check(await supabase.from('tasks').update({assignee_id:idFor(label)}).eq('id',id).select('id').single());
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
    return check(await supabase.from('knowledge_articles')
      .select('id,title,summary,body,category,status,tags,event_id,author_id,version,created_at,updated_at')
      .order('updated_at',{ascending:false}));
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
      .select('id,article_id,version,title,summary,body,category,status,created_at')
      .eq('article_id',id).order('version',{ascending:false}));
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
