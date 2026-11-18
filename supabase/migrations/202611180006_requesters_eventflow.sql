-- DCS HUB v0.8 · Solicitantes, ficha operacional e checklist específico por tipo.
-- Código para projeto Supabase ISOLADO do HUB; NUNCA aplicar em BUSCA AUTORIDADE.
-- Requer migrações 001–005. A função realiza criação de evento + checklist em uma transação.
begin;
create table public.event_requesters (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 2 and 160),
 kind text not null check(kind in ('deputado','setor','outro')),
 source text not null default 'Cadastro administrativo' check(length(source)<=160),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index event_requesters_name_key on public.event_requesters(lower(btrim(name)));
create trigger event_requesters_timestamp before update on public.event_requesters for each row
execute function public.set_updated_at();
insert into public.event_requesters(name,kind,source)
select trim(n), 'deputado', 'ALESP · 20ª Legislatura · ref. 18/11/2026'
from unnest(string_to_array('AGENTE FEDERAL DANILO BALAS|ALEX MADUREIRA|ALTAIR MORAES|ANA CAROLINA SERRA|ANALICE FERNANDES|ANA PERUGINI|ANDRÉA WERNER|ANDRÉ BUENO|ANDRÉ DO PRADO|ATILA JACOMUSSI|BARROS MUNHOZ|BETH SAHÃO|BRUNA FURLAN|BRUNO ZAMBELLI|CAIO FRANÇA|CAPITÃO TELHADA|CARLA MORANDO|CARLÃO PIGNATARI|CARLOS GIANNAZI|CLARICE GANEM|CONTE LOPES|DANI ALONSO|DANIEL SOARES|DELEGADA GRACIELA|DELEGADO OLIM|DIRCEU DALBEN|DONATO|DR. EDUARDO NÓBREGA|DR. ELTON|DR. JORGE DO CARMO|DRA. DAMARIS MOURA|EDIANE MARIA|EDNA MACEDO|EDSON GIRIBONI|EDUARDO SUPLICY|EMÍDIO DE SOUZA|ENIO TATTO|FABIANA BOLSONARO|FÁBIO FARIA DE SÁ|FELIPE FRANCO|GIL DINIZ BOLSONARO|GILMACI SANTOS|GUILHERME CORTEZ|GUTO ZACARIAS|ITAMAR BORGES|JORGE CARUSO|JORGE WILSON XERIFE DO CONSUMIDOR|LECI BRANDÃO|LEONARDO SIQUEIRA|LÉO OLIVEIRA|LETÍCIA AGUIAR|LUCAS BOVE|LUIZ CLAUDIO MARCOLINO|LUIZ FERNANDO T. FERREIRA|MAJOR MECCA|MARCELO AGUIAR|MÁRCIA LIA|MARCIO NAKASHIMA|MARCOS DAMASIO|MARIA LÚCIA AMARY|MARINA HELOU|MARTA COSTA|MAURICI|MAURO BRAGATO|MILTON LEITE FILHO|MONICA SEIXAS DO MOVIMENTO PRETAS|OSEIAS DE MADUREIRA|PAULA DA BANCADA FEMINISTA|PAULO CORREA JR|PAULO FIORILO|PAULO MANSUR|PROFESSORA BEBEL|PROFª CAMILA GODOI|RAFAEL SARAIVA|RAFAEL SILVA|RAFA ZIMBALDI|REIS|RICARDO FRANÇA|RICARDO MADALENA|RODRIGO MORAES|ROGÉRIO NOGUEIRA|ROGÉRIO SANTOS|RÔMULO FERNANDES|RUI ALVES|SEBASTIÃO SANTOS|SOLANGE FREITAS|TENENTE COIMBRA|TEONILIO BARBA|THAINARA FARIA|THIAGO AURICCHIO|TOMÉ ABDUCH|VALDOMIRO LOPES|VALERIA BOLSONARO|VITÃO DO CACHORRÃO','|')) n
on conflict do nothing;

alter table public.event_requesters enable row level security;
create policy requesters_read on public.event_requesters for select to authenticated
using ((select public.is_member()));
create policy requesters_insert on public.event_requesters for insert to authenticated
with check ((select public.is_admin()));
create policy requesters_update on public.event_requesters for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.event_requesters from public,anon,authenticated;
grant select,insert on public.event_requesters to authenticated;
grant update(name,kind,source,active) on public.event_requesters to authenticated;

alter table public.events
 add column requester_id uuid references public.event_requesters(id) on delete restrict,
 add column requester_name_snapshot text,
 add column event_kind text check(event_kind in
  ('sessao_solene','audiencia_publica','cursos_palestras','recepcao_autoridades',
   'velorio','reuniao','exposicao','visita_guiada','comunicacao_visual')),
 add column team text check(team in ('DCS','Cerimonial')),
 add column briefing jsonb not null default '{}'::jsonb;
create index events_requester_idx on public.events(requester_id);
create index events_kind_idx on public.events(event_kind);

alter table public.event_checklist
 alter column template_item_id drop not null,
 add column phase text not null default 'Preparação',
 add column applicable boolean not null default true,
 add column assignee_id uuid references public.profiles(id),
 add column team text check(team in ('DCS','Cerimonial')),
 add column due_at date,
 add column priority text not null default 'medium' check(priority in ('high','medium','low'));

-- Preserva os checklists antigos para atividades anteriores à migração.
create or replace function public.create_checklist_from_template()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.event_kind is not null then return new; end if;
 insert into public.event_checklist(event_id,template_item_id,label,position)
 select new.id, ti.id,ti.label,ti.position from public.event_templates et
 join public.template_items ti on ti.template_id=et.id
 where et.category=new.category and et.active
 on conflict (event_id,template_item_id) do nothing;
 return new;
end;
$$;
revoke all on function public.create_checklist_from_template() from public,anon,authenticated;

-- Não permitir inserção arbitrária do checklist pelo cliente. Apenas a RPC
-- transacional, com auth.uid() e verificações de RLS/integridade, cria linhas.
create function public.create_planned_event(
 p_title text,p_kind text,p_category text,p_requester uuid,p_venue uuid,
 p_team text,p_start timestamptz,p_end timestamptz,p_briefing jsonb,p_items jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_event uuid; v_name text; v_venue text; v_item jsonb;
 v_id uuid; v_dept text; v_active boolean; v_role text; v_pos integer:=0;
 v_group text; v_priority text; v_title text;
begin
 if (select auth.uid()) is null or not public.is_editor() then
  raise exception 'Você não tem permissão para criar eventos';
 end if;
 if length(btrim(coalesce(p_title,''))) not between 3 and 160 then raise exception 'Título inválido'; end if;
 if p_kind not in ('sessao_solene','audiencia_publica','cursos_palestras','recepcao_autoridades',
    'velorio','reuniao','exposicao','visita_guiada','comunicacao_visual') then raise exception 'Tipo inválido'; end if;
 if p_category not in ('cer','exp','vis','cv','reu') or p_team not in ('DCS','Cerimonial') then raise exception 'Categoria ou equipe inválida'; end if;
 if (p_kind='reuniao' and p_category<>'reu') or
    (p_kind='exposicao' and p_category<>'exp') or
    (p_kind='visita_guiada' and p_category<>'vis') or
    (p_kind='comunicacao_visual' and p_category<>'cv') or
    (p_kind in ('sessao_solene','audiencia_publica','cursos_palestras','recepcao_autoridades','velorio') and p_category<>'cer')
 then raise exception 'Tipo e categoria incompatíveis'; end if;
 if p_end <= p_start or p_end is null or p_start is null then raise exception 'Datas inválidas'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>80
    or jsonb_array_length(p_items)<1 then raise exception 'Checklist inválido'; end if;
 if p_briefing is null or jsonb_typeof(p_briefing)<>'object' or length(p_briefing::text)>12000 then
  raise exception 'Ficha de planejamento inválida'; end if;
 select name into v_name from public.event_requesters where id=p_requester and active;
 if v_name is null then raise exception 'Solicitante inválido/inativo'; end if;
 select name into v_venue from public.venues where id=p_venue and active;
 if v_venue is null then raise exception 'Espaço inválido/inativo'; end if;
 insert into public.events (title,category,description,location,start_at,end_at,
   created_by,owner_id,status,venue_id,requester_id,requester_name_snapshot,event_kind,team,briefing)
 values(btrim(p_title),p_category,left(coalesce(p_briefing->>'description',''),2000),v_venue,
   p_start,p_end,auth.uid(),auth.uid(),'pending',p_venue,p_requester,v_name,p_kind,p_team,p_briefing)
 returning id into v_event;

 for v_item in select value from jsonb_array_elements(p_items) loop
  v_pos:=v_pos+1;
  v_title:=btrim(coalesce(v_item->>'title',''));
  if length(v_title) not between 1 and 200 then raise exception 'Título de etapa inválido'; end if;
  v_group:=coalesce(nullif(v_item->>'team',''),p_team);
  v_priority:=coalesce(nullif(v_item->>'priority',''),'medium');
  if v_group not in ('DCS','Cerimonial') or v_priority not in ('high','medium','low') then
   raise exception 'Equipe/prioridade de etapa inválida';
  end if;
  v_id:=nullif(v_item->>'assignee_id','')::uuid;
  if v_id is not null then
   select department,active,role into v_dept,v_active,v_role from public.profiles where id=v_id;
   if not found or not v_active or v_role='reader' or v_dept is distinct from v_group then
    raise exception 'Responsável inválido ou fora da equipe';
   end if;
  end if;
  insert into public.event_checklist(event_id,template_item_id,label,position,
    phase,applicable,assignee_id,team,due_at,priority)
  values(v_event,null,v_title,v_pos,left(coalesce(v_item->>'section','Preparação'),80),
   coalesce((v_item->>'applicable')::boolean,true),v_id,v_group,
   nullif(v_item->>'due_at','')::date,v_priority);
 end loop;
 return v_event;
end;
$$;
revoke all on function public.create_planned_event(text,text,text,uuid,uuid,text,timestamptz,timestamptz,jsonb,jsonb) from public,anon;
grant execute on function public.create_planned_event(text,text,text,uuid,uuid,text,timestamptz,timestamptz,jsonb,jsonb) to authenticated;

-- Confirmação do gestor preserva responsáveis e prazos escolhidos e evita duplicação.
create or replace function public.approve_event(p_event_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v public.events%rowtype; inserted_count integer;
begin
 if (select auth.uid()) is null or not public.is_manager() then
  raise exception 'Apenas Gestor/Administrador pode confirmar eventos';
 end if;
 select * into v from public.events where id=p_event_id for update;
 if not found or v.status not in ('pending','confirmed') then
  raise exception 'Evento não encontrado ou não confirmável';
 end if;
 if v.status='pending' then
  update public.events set status='confirmed',approved_by=auth.uid(),approved_at=now()
  where id=p_event_id;
 end if;
 insert into public.tasks (event_id,title,assignee_id,team,created_by,due_at,priority,status,source_checklist_id)
 select ec.event_id,left(ec.label,160),ec.assignee_id,
   coalesce(ec.team,v.team,'DCS'),auth.uid(),
   coalesce(ec.due_at,(v.start_at at time zone 'America/Sao_Paulo')::date),
   ec.priority,'pending',ec.id
 from public.event_checklist ec where ec.event_id=p_event_id and ec.applicable and not ec.completed and ec.assignee_id is not null
 on conflict (source_checklist_id) do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count;
end;
$$;
revoke all on function public.approve_event(uuid) from public,anon;
grant execute on function public.approve_event(uuid) to authenticated;
-- Delegação posterior de uma etapa, mantendo checklist e Kanban sincronizados.
-- Executada somente pelo gestor ou criador autorizado do evento.
create function public.delegate_event_checklist(
 p_checklist uuid,p_assignee uuid,p_team text,p_due date
) returns void language plpgsql security definer set search_path='' as $$
declare v_ec public.event_checklist%rowtype; v_ev public.events%rowtype;
 v_dept text;v_active boolean;v_role text;v_task uuid;
begin
 if (select auth.uid()) is null or not public.is_editor() then
  raise exception 'Sem permissão de delegação';
 end if;
 select * into v_ec from public.event_checklist where id=p_checklist for update;
 if not found then raise exception 'Etapa não encontrada'; end if;
 select * into v_ev from public.events where id=v_ec.event_id;
 if not found or v_ev.status not in ('pending','confirmed') then
  raise exception 'Evento não permite atribuições';
 end if;
 if not (public.is_manager() or v_ev.created_by=auth.uid()) then
  raise exception 'Somente o criador ou gestor atribui esta tarefa';
 end if;
 if p_team not in ('DCS','Cerimonial') then raise exception 'Equipe inválida'; end if;
 if p_assignee is not null then
  select department,active,role into v_dept,v_active,v_role from public.profiles where id=p_assignee;
  if not found or not v_active or v_role='reader' or v_dept is distinct from p_team then
   raise exception 'Responsável fora da equipe ou sem permissão';
  end if;
 end if;
 update public.event_checklist
 set assignee_id=p_assignee,team=p_team,due_at=p_due,applicable=true
 where id=p_checklist;
 select id into v_task from public.tasks where source_checklist_id=p_checklist for update;
 if v_task is not null then
  update public.tasks set assignee_id=p_assignee,team=p_team,
   due_at=coalesce(p_due,(v_ev.start_at at time zone 'America/Sao_Paulo')::date)
   where id=v_task;
 elsif v_ev.status='confirmed' and p_assignee is not null and not v_ec.completed then
  insert into public.tasks(event_id,title,assignee_id,team,created_by,due_at,priority,status,source_checklist_id)
  values(v_ev.id,left(v_ec.label,160),p_assignee,p_team,auth.uid(),
   coalesce(p_due,(v_ev.start_at at time zone 'America/Sao_Paulo')::date),
   v_ec.priority,'pending',v_ec.id)
  on conflict (source_checklist_id) do nothing;
 end if;
end;
$$;
revoke all on function public.delegate_event_checklist(uuid,uuid,text,date) from public,anon;
grant execute on function public.delegate_event_checklist(uuid,uuid,text,date) to authenticated;

commit;