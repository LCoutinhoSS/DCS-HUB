-- DCS HUB v0.9: reuniões vinculadas a eventos e execução segura de tarefas.
-- Projeto compartilhado: NÃO toca em Autoridades SP, auth.users ou perfis_usuarios.
begin;

create table public.event_meetings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 160),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check(duration_minutes between 15 and 720),
  format text not null default 'presencial' check(format in ('presencial','hibrida','virtual')),
  attendees text not null default '' check(length(attendees)<=2500),
  agenda text not null default '' check(length(agenda)<=5000),
  minutes text not null default '' check(length(minutes)<=8000),
  decisions text not null default '' check(length(decisions)<=8000),
  status text not null default 'agendada' check(status in ('agendada','realizada','cancelada')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_meetings_event_start_idx on public.event_meetings(event_id,starts_at desc);
create trigger event_meetings_timestamp before update on public.event_meetings
for each row execute function public.set_updated_at();

create function public.dcs_guard_meeting()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if tg_op='UPDATE' and
    (new.event_id is distinct from old.event_id or new.created_by is distinct from old.created_by)
 then raise exception 'Não é permitido mudar o evento nem o autor da reunião'; end if;
 if not exists(select 1 from public.events e where e.id=new.event_id and e.status <> 'canceled')
 then raise exception 'Evento indisponível para reunião'; end if;
 return new;
end;
$fn$;
create trigger dcs_guard_meeting_data before insert or update on public.event_meetings
for each row execute function public.dcs_guard_meeting();

create function public.dcs_log_meeting_change()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 insert into public.event_history(event_id,actor_id,action,details)
 values(new.event_id,auth.uid(),
   case when tg_op='INSERT' then 'meeting_created' else 'meeting_updated' end,
   jsonb_build_object('meeting_id',new.id,'title',new.title,'status',new.status));
 return new;
end;
$fn$;
create trigger dcs_meeting_history after insert or update on public.event_meetings
for each row execute function public.dcs_log_meeting_change();

alter table public.event_meetings enable row level security;
create policy dcs_meeting_read on public.event_meetings for select to authenticated
using ((select public.is_member()));
create policy dcs_meeting_insert on public.event_meetings for insert to authenticated
with check ((select public.is_editor()) and created_by=(select auth.uid()));
create policy dcs_meeting_update on public.event_meetings for update to authenticated
using ((select public.is_editor()) and (created_by=(select auth.uid()) or (select public.is_manager())))
with check ((select public.is_editor()) and (created_by=(select auth.uid()) or (select public.is_manager())));
revoke all on public.event_meetings from public,anon,authenticated;
grant select,insert,update on public.event_meetings to authenticated;

alter table public.tasks add column meeting_id uuid references public.event_meetings(id) on delete set null;
create index dcs_tasks_meeting_idx on public.tasks(meeting_id) where meeting_id is not null;
create function public.dcs_validate_meeting_task()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.meeting_id is not null and (
   new.event_id is null or
   not exists (select 1 from public.event_meetings m
               where m.id=new.meeting_id and m.event_id=new.event_id)
 ) then raise exception 'A tarefa deve pertencer ao mesmo evento da reunião'; end if;
 return new;
end;
$fn$;
create trigger dcs_match_meeting_task before insert or update on public.tasks
for each row execute function public.dcs_validate_meeting_task();

-- Direct tasks UPDATE allowed excessive changes to non-admin users. All edits
-- must go through the following narrow RPCs, which check actor and ownership.
revoke update on public.tasks from authenticated;
revoke update on public.event_checklist from authenticated;

create function public.dcs_set_task_status(p_task_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $fn$
declare v public.tasks%rowtype; me uuid := auth.uid();
begin
 if me is null or not public.is_editor() then raise exception 'Acesso negado'; end if;
 if p_status not in ('pending','in_progress','awaiting_approval','completed','canceled')
 then raise exception 'Status inválido'; end if;
 select * into v from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Tarefa não encontrada'; end if;
 if not(public.is_manager() or v.created_by=me or v.assignee_id=me)
 then raise exception 'Somente criador, responsável ou gestor altera a tarefa'; end if;
 if v.assignee_id=me and v.created_by is distinct from me and not public.is_manager()
    and p_status in ('canceled','awaiting_approval')
 then raise exception 'Responsável não pode cancelar/aprovar a tarefa'; end if;
 update public.tasks set status=p_status where id=p_task_id;
 if v.source_checklist_id is not null and p_status in ('completed','pending','in_progress') then
  update public.event_checklist set completed=(p_status='completed'),
   completed_at=case when p_status='completed' then now() else null end,
   completed_by=case when p_status='completed' then me else null end
  where id=v.source_checklist_id;
 end if;
end;
$fn$;

create function public.dcs_assign_task(p_task_id uuid,p_assignee_id uuid,p_team text)
returns void language plpgsql security definer set search_path='' as $fn$
declare v public.tasks%rowtype; me uuid := auth.uid(); dept text; is_active boolean; r text;
begin
 if me is null or not public.is_editor() then raise exception 'Acesso negado'; end if;
 select * into v from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Tarefa não encontrada'; end if;
 if not (public.is_manager() or v.created_by=me) then
  raise exception 'Somente criador ou gestor distribui tarefas'; end if;
 if p_team not in ('DCS','Cerimonial') then raise exception 'Equipe inválida'; end if;
 if p_assignee_id is not null then
   select department,active,role into dept,is_active,r from public.profiles where id=p_assignee_id;
   if not found or not is_active or r='reader' or dept is distinct from p_team
   then raise exception 'Responsável não é servidor ativo da equipe'; end if;
 end if;
 if v.source_checklist_id is not null then
   update public.event_checklist set assignee_id=p_assignee_id,team=p_team
   where id=v.source_checklist_id;
 end if;
 update public.tasks set assignee_id=p_assignee_id,team=p_team where id=p_task_id;
end;
$fn$;

create function public.dcs_set_checklist_complete(p_checklist_id uuid,p_completed boolean)
returns void language plpgsql security definer set search_path='' as $fn$
declare v public.event_checklist%rowtype; e public.events%rowtype;
       t public.tasks%rowtype; me uuid := auth.uid();
begin
 if me is null or not public.is_editor() then raise exception 'Acesso negado'; end if;
 select * into v from public.event_checklist where id=p_checklist_id for update;
 if not found then raise exception 'Item não encontrado'; end if;
 select * into e from public.events where id=v.event_id;
 if not found or e.status='canceled' then raise exception 'Evento indisponível'; end if;
 select * into t from public.tasks where source_checklist_id=v.id for update;
 if not(public.is_manager() or e.created_by=me or v.assignee_id=me or (t.id is not null and t.assignee_id=me))
 then raise exception 'Etapa não atribuída a esta pessoa'; end if;
 update public.event_checklist
 set completed=p_completed,
     completed_at=case when p_completed then now() else null end,
     completed_by=case when p_completed then me else null end
 where id=p_checklist_id;
 if t.id is not null then
   update public.tasks set status=case when p_completed then 'completed' else 'pending' end
   where id=t.id;
 end if;
end;
$fn$;

alter table public.task_notifications drop constraint task_notifications_kind_check;
alter table public.task_notifications add constraint task_notifications_kind_check
check(kind in ('assigned','reassigned','status'));
create function public.dcs_notify_task_status()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare me uuid := auth.uid();
begin
 if new.status is distinct from old.status and new.created_by is distinct from me then
  insert into public.task_notifications(task_id,recipient_id,assigned_by,kind,title)
  values(new.id,new.created_by,me,'status',
   left('Tarefa "'||new.title||'": '||
     case new.status
      when 'in_progress' then 'em andamento'
      when 'completed' then 'concluída'
      when 'pending' then 'voltou a pendente'
      when 'awaiting_approval' then 'aguardando aprovação'
      else 'cancelada' end,240));
 end if;
 return new;
end;
$fn$;
create trigger dcs_task_status_notification after update of status on public.tasks
for each row execute function public.dcs_notify_task_status();

-- Authorisation is inside the RPCs; EXECUTE for unauthenticated denied.
revoke all on function public.dcs_guard_meeting(), public.dcs_log_meeting_change(),
 public.dcs_validate_meeting_task(),public.dcs_notify_task_status() from public,anon,authenticated;
revoke all on function public.dcs_set_task_status(uuid,text),
 public.dcs_assign_task(uuid,uuid,text),public.dcs_set_checklist_complete(uuid,boolean) from public,anon;
grant execute on function public.dcs_set_task_status(uuid,text),
 public.dcs_assign_task(uuid,uuid,text),public.dcs_set_checklist_complete(uuid,boolean) to authenticated;

commit;
