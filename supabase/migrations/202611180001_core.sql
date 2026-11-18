-- DCS HUB v0.3: base operacional separada do Autoridades SP.
-- Requer Supabase Auth. Aplicar somente em projeto Supabase NOVO e próprio do DCS HUB.
-- Sem dados de pessoas/eventos reais; nenhum acesso a ambientes Microsoft ou Autoridades SP.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Usuário',
  role text not null default 'reader' check (role in ('admin','manager','dcs','ceremonial','reader')),
  department text not null default 'DCS' check (department in ('DCS','Cerimonial')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conta nova entra desativada como leitor. Dados editáveis de user_metadata nunca concedem papéis.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name,role,active)
  values(new.id, coalesce(new.email, ''), coalesce(nullif(split_part(new.email,'@',1),''),'Usuário'), 'reader', false);
  return new;
end $$;
-- Banco compartilhado com Autoridades SP: NÃO instalar gatilho em auth.users.
-- A função de registro DCS é chamada sob demanda após o login (migração 007).
-- A função handle_new_user é mantida para compatibilidade, mas não cria gatilho global.

create function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;
create function public.is_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role in ('admin','manager','dcs','ceremonial'));
$$;
create function public.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role in ('admin','manager'));
$$;
create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role = 'admin');
$$;

create table public.event_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null unique check (category in ('cer','exp','vis','cv','reu')),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.event_templates(id) on delete cascade,
  position integer not null check(position > 0),
  label text not null check(length(btrim(label)) between 1 and 200),
  unique(template_id,position)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 1 and 160),
  category text not null check(category in ('cer','exp','vis','cv','reu')),
  description text,
  location text not null default 'A definir',
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','confirmed','awaiting_approval','completed','canceled')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  owner_id uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_period check(end_at > start_at)
);
create index idx_events_dates on public.events(start_at,end_at);
create index idx_events_owner on public.events(owner_id);
create index idx_events_status on public.events(status);

create table public.event_checklist (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  template_item_id uuid not null references public.template_items(id),
  label text not null,
  position integer not null,
  completed boolean not null default false,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  unique(event_id,template_item_id)
);
create index idx_checklist_event on public.event_checklist(event_id,position);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  title text not null check(length(btrim(title)) between 1 and 160),
  description text,
  assignee_id uuid references public.profiles(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  due_at date,
  priority text not null default 'medium' check(priority in ('high','medium','low')),
  status text not null default 'pending' check(status in ('pending','in_progress','awaiting_approval','completed','canceled')),
  source_checklist_id uuid unique references public.event_checklist(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_assignee on public.tasks(assignee_id,status,due_at);
create index idx_tasks_event on public.tasks(event_id);

-- Índice/contexto dos arquivos. Nenhum arquivo do SharePoint é copiado.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null check(length(btrim(title)) between 1 and 200),
  kind text not null default 'other',
  provider text not null check(provider in ('sharepoint','onedrive','hub')),
  reference_url text check(reference_url is null or reference_url ~* '^https://'),
  storage_path text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_reference check(
    (provider in ('sharepoint','onedrive') and reference_url is not null and storage_path is null)
    or (provider = 'hub' and storage_path is not null and reference_url is null)
  )
);
create index idx_documents_event on public.documents(event_id);
create index idx_documents_task on public.documents(task_id);

-- Somente vínculo de referência. A autoridade continua sendo mantida no Autoridades SP.
create table public.event_authorities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  external_authority_id text not null,
  display_name_snapshot text not null,
  participation_role text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(event_id,external_authority_id)
);

create table public.event_history (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_history_event_time on public.event_history(event_id,created_at desc);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profile_timestamp before update on public.profiles for each row execute function public.set_updated_at();
create trigger event_timestamp before update on public.events for each row execute function public.set_updated_at();
create trigger task_timestamp before update on public.tasks for each row execute function public.set_updated_at();
create trigger document_timestamp before update on public.documents for each row execute function public.set_updated_at();

-- Proteções no banco contra adulteração de status e autoria pela API pública.
create function public.guard_event() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.owner_id is not null and not exists(select 1 from public.profiles where id=new.owner_id and active) then
      raise exception 'Responsável inativo ou inexistente';
    end if;
    return new;
  end if;
  if new.created_by is distinct from old.created_by or new.category is distinct from old.category then
    raise exception 'Autoria e categoria não podem ser alteradas';
  end if;
  if new.status is distinct from old.status or new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at then
    if not public.is_manager() then raise exception 'Somente Gestor/Administrador altera aprovação ou status'; end if;
  end if;
  if new.owner_id is not null and not exists(select 1 from public.profiles where id=new.owner_id and active) then
    raise exception 'Responsável inativo ou inexistente';
  end if;
  return new;
end $$;
create trigger guard_events before insert or update on public.events for each row execute function public.guard_event();

create function public.create_checklist_from_template() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.event_checklist(event_id,template_item_id,label,position)
  select new.id, ti.id, ti.label, ti.position from public.event_templates et
  join public.template_items ti on ti.template_id=et.id
  where et.category=new.category and et.active
  on conflict (event_id,template_item_id) do nothing;
  return new;
end $$;
create trigger generate_checklist after insert on public.events for each row execute function public.create_checklist_from_template();

create function public.guard_checklist() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.event_id is distinct from old.event_id or new.template_item_id is distinct from old.template_item_id
    or new.label is distinct from old.label or new.position is distinct from old.position then
      raise exception 'Somente o estado do checklist pode ser alterado';
  end if;
  if new.completed is distinct from old.completed then
    new.completed_by = case when new.completed then auth.uid() else null end;
    new.completed_at = case when new.completed then now() else null end;
  elsif new.completed_by is distinct from old.completed_by or new.completed_at is distinct from old.completed_at then
    raise exception 'Marcadores de conclusão são geridos pelo servidor';
  end if;
  return new;
end $$;
create trigger protect_checklist before update on public.event_checklist for each row execute function public.guard_checklist();

create function public.guard_task() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by or new.source_checklist_id is distinct from old.source_checklist_id
      or (old.source_checklist_id is not null and new.event_id is distinct from old.event_id) then
      raise exception 'Autoria, origem e vínculo do modelo são imutáveis';
    end if;
  end if;
  if new.assignee_id is not null and not exists(select 1 from public.profiles where id=new.assignee_id and active and role <> 'reader') then
    raise exception 'O responsável deve ser um servidor ativo com permissão de edição';
  end if;
  return new;
end $$;
create trigger protect_tasks before insert or update on public.tasks for each row execute function public.guard_task();

create function public.guard_document() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by then raise exception 'Autoria do documento é imutável'; end if;
  return new;
end $$;
create trigger protect_documents before update on public.documents for each row execute function public.guard_document();

-- Histórico gerado pelo servidor, nunca pelo cliente.
create function public.log_event_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.event_history(event_id,actor_id,action,details) values(new.id,auth.uid(),'event_created',jsonb_build_object('title',new.title));
  elsif new.status is distinct from old.status then
    insert into public.event_history(event_id,actor_id,action,details) values(new.id,auth.uid(),'event_status',jsonb_build_object('from',old.status,'to',new.status));
  elsif new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at then
    insert into public.event_history(event_id,actor_id,action,details) values(new.id,auth.uid(),'event_rescheduled',jsonb_build_object('from',old.start_at,'to',new.start_at));
  else
    insert into public.event_history(event_id,actor_id,action,details) values(new.id,auth.uid(),'event_updated','{}');
  end if;
  return new;
end $$;
create trigger event_change_history after insert or update on public.events for each row execute function public.log_event_change();

create function public.log_task_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.event_id is not null then
    insert into public.event_history(event_id,actor_id,action,details) values(new.event_id,auth.uid(),'task_created',jsonb_build_object('title',new.title));
  elsif tg_op = 'UPDATE' and new.event_id is not null and new.status is distinct from old.status then
    insert into public.event_history(event_id,actor_id,action,details) values(new.event_id,auth.uid(),'task_status',jsonb_build_object('title',new.title,'to',new.status));
  end if;
  return new;
end $$;
create trigger task_change_history after insert or update on public.tasks for each row execute function public.log_task_change();

-- Atomicidade / idempotência: confirmar pela segunda vez não duplica tarefas.
create function public.approve_event(p_event_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v public.events%rowtype; inserted_count integer;
begin
  if not public.is_manager() then raise exception 'Apenas Gestor/Administrador pode confirmar eventos'; end if;
  select * into v from public.events where id=p_event_id for update;
  if not found then raise exception 'Evento não encontrado'; end if;
  if v.status not in ('pending','confirmed') then raise exception 'Evento não está pendente/confirmado'; end if;
  if v.status = 'pending' then
    update public.events set status='confirmed',approved_by=auth.uid(),approved_at=now() where id=p_event_id;
  end if;
  insert into public.tasks(event_id,title,assignee_id,created_by,due_at,priority,status,source_checklist_id)
  select ec.event_id,ec.label,v.owner_id,auth.uid(),(v.start_at at time zone 'America/Sao_Paulo')::date,'medium','pending',ec.id
  from public.event_checklist ec
  where ec.event_id=p_event_id and not ec.completed
  on conflict (source_checklist_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;

create function public.reschedule_event(p_event_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v public.events%rowtype;
begin
  if not public.is_editor() then raise exception 'Sem permissão para reagendar'; end if;
  if p_end_at <= p_start_at then raise exception 'Fim deve ser posterior ao início'; end if;
  select * into v from public.events where id=p_event_id for update;
  if not found then raise exception 'Evento não encontrado'; end if;
  if not (public.is_manager() or (v.created_by=auth.uid() and v.status='pending')) then
    raise exception 'Somente gestor ou criador de evento pendente pode reagendar';
  end if;
  if v.status in ('completed','canceled') then raise exception 'Evento encerrado não pode ser reagendado'; end if;
  update public.events set start_at=p_start_at,end_at=p_end_at where id=p_event_id;
  insert into public.event_history(event_id,actor_id,action,details)
  values(p_event_id,auth.uid(),'reschedule_reason',jsonb_build_object('reason',left(coalesce(p_reason,''),300)));
end $$;

-- RLS em TODAS as tabelas expostas.
alter table public.profiles enable row level security;
alter table public.event_templates enable row level security;
alter table public.template_items enable row level security;
alter table public.events enable row level security;
alter table public.event_checklist enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.event_authorities enable row level security;
alter table public.event_history enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id=(select auth.uid()) or (select public.is_member()));
create policy profiles_admin_update on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy templates_read on public.event_templates for select to authenticated using ((select public.is_member()));
create policy template_items_read on public.template_items for select to authenticated using ((select public.is_member()));
create policy templates_manage on public.event_templates for all to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));
create policy template_items_manage on public.template_items for all to authenticated
  using ((select public.is_manager())) with check ((select public.is_manager()));

create policy events_read on public.events for select to authenticated using ((select public.is_member()));
create policy events_insert on public.events for insert to authenticated
  with check ((select public.is_editor()) and created_by=(select auth.uid()) and status='pending' and approved_by is null and approved_at is null);
create policy events_update on public.events for update to authenticated
  using ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid()) and status='pending'))
  with check ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid()) and status='pending'));
-- Sem DELETE: eventos são cancelados e permanecem auditáveis.

create policy checklist_read on public.event_checklist for select to authenticated using ((select public.is_member()));
create policy checklist_update on public.event_checklist for update to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy tasks_read on public.tasks for select to authenticated using ((select public.is_member()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check ((select public.is_editor()) and created_by=(select auth.uid()) and status='pending' and source_checklist_id is null);
create policy tasks_update on public.tasks for update to authenticated
  using ((select public.is_manager()) or ((select public.is_editor()) and (created_by=(select auth.uid()) or assignee_id=(select auth.uid()))))
  with check ((select public.is_manager()) or ((select public.is_editor()) and (created_by=(select auth.uid()) or assignee_id=(select auth.uid()))));
create policy tasks_delete on public.tasks for delete to authenticated
  using (source_checklist_id is null and ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid()))));

create policy documents_read on public.documents for select to authenticated using ((select public.is_member()));
create policy documents_insert on public.documents for insert to authenticated
  with check ((select public.is_editor()) and created_by=(select auth.uid()));
create policy documents_update on public.documents for update to authenticated
  using ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid())))
  with check ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid())));
create policy documents_delete on public.documents for delete to authenticated
  using ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid())));

create policy authorities_read on public.event_authorities for select to authenticated using ((select public.is_member()));
create policy authorities_insert on public.event_authorities for insert to authenticated
  with check ((select public.is_editor()) and created_by=(select auth.uid()));
create policy authorities_delete on public.event_authorities for delete to authenticated
  using ((select public.is_manager()) or ((select public.is_editor()) and created_by=(select auth.uid())));
create policy history_read on public.event_history for select to authenticated using ((select public.is_member()));
-- Sem políticas de escrita para event_history: somente triggers / funções privilegiadas.

-- Não conceder acesso a anon. As funções-definer de escrita têm acesso apenas autenticado.
revoke all on public.profiles,public.event_templates,public.template_items,public.events,public.event_checklist,
  public.tasks,public.documents,public.event_authorities,public.event_history from anon,authenticated;
grant select on public.profiles,public.event_templates,public.template_items,public.events,public.event_checklist,
  public.tasks,public.documents,public.event_authorities,public.event_history to authenticated;
grant update(role,department,active,full_name) on public.profiles to authenticated;
grant insert,update,delete on public.event_templates,public.template_items to authenticated;
grant insert,update on public.events to authenticated;
grant update(completed) on public.event_checklist to authenticated;
grant insert,update,delete on public.tasks,public.documents,public.event_authorities to authenticated;

revoke all on function public.handle_new_user(),public.set_updated_at(),public.guard_event(),public.create_checklist_from_template(),
  public.guard_checklist(),public.guard_task(),public.guard_document(),public.log_event_change(),public.log_task_change() from public,anon,authenticated;
revoke all on function public.approve_event(uuid),public.reschedule_event(uuid,timestamptz,timestamptz,text) from public,anon;
revoke all on function public.is_member(),public.is_editor(),public.is_manager(),public.is_admin() from public,anon;
grant execute on function public.is_member(),public.is_editor(),public.is_manager(),public.is_admin(),
  public.approve_event(uuid),public.reschedule_event(uuid,timestamptz,timestamptz,text) to authenticated;
