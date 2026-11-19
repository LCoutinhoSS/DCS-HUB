-- DCS HUB v0.10 — aceite, comentários, atrasos e lembretes internos.
-- Projeto Supabase compartilhado: NÃO altera tabelas do Autoridades SP.
begin;

alter table public.tasks
  add column accepted_at timestamptz,
  add column accepted_by uuid references public.profiles(id);

-- A aceitação pertence à atribuição atual; uma redistribuição exige novo aceite.
create function public.dcs_reset_task_acceptance()
returns trigger language plpgsql set search_path='' as $fn$
begin
  if new.assignee_id is distinct from old.assignee_id then
    new.accepted_at:=null;
    new.accepted_by:=null;
  end if;
  return new;
end;
$fn$;
create trigger dcs_reset_acceptance_before_reassign
before update of assignee_id on public.tasks
for each row execute function public.dcs_reset_task_acceptance();

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id),
  body text not null check(length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index task_comments_task_created_idx on public.task_comments(task_id,created_at,id);
alter table public.task_comments enable row level security;

-- Conversa de trabalho somente entre quem criou, quem recebeu ou gestor.
create policy dcs_task_comments_read on public.task_comments
for select to authenticated
using (
 (select public.is_member()) and exists(
  select 1 from public.tasks t where t.id=task_id
  and (t.created_by=(select auth.uid()) or t.assignee_id=(select auth.uid())
       or (select public.is_manager()))
 )
);
create policy dcs_task_comments_add on public.task_comments
for insert to authenticated
with check (
 (select public.is_editor()) and author_id=(select auth.uid())
 and exists(
  select 1 from public.tasks t where t.id=task_id
  and (t.created_by=(select auth.uid()) or t.assignee_id=(select auth.uid())
       or (select public.is_manager()))
 )
);
revoke all on public.task_comments from public,anon,authenticated;
grant select,insert on public.task_comments to authenticated;

-- Aceite formal: só o responsável atual pode aceitar, nunca um leitor.
create function public.dcs_accept_task(p_task_id uuid)
returns void language plpgsql security definer set search_path='' as $fn$
declare v public.tasks%rowtype; me uuid:=auth.uid();
begin
 if me is null or not public.is_editor() then raise exception 'Acesso não autorizado'; end if;
 select * into v from public.tasks where id=p_task_id for update;
 if not found or v.assignee_id is distinct from me then
  raise exception 'Somente o responsável atual aceita a tarefa';
 end if;
 if v.status in ('completed','canceled') then raise exception 'Tarefa encerrada'; end if;
 if v.accepted_at is null then
  update public.tasks set accepted_at=now(),accepted_by=me where id=p_task_id;
 end if;
end;
$fn$;

alter table public.task_notifications drop constraint task_notifications_kind_check;
alter table public.task_notifications add constraint task_notifications_kind_check
check(kind in ('assigned','reassigned','status','accepted','comment','reminder'));
alter table public.task_notifications add column reminder_day date;
create unique index task_notifications_daily_reminder_unique
on public.task_notifications(task_id,recipient_id,reminder_day)
where kind='reminder' and reminder_day is not null;

-- Dispara avisos internos ao autor quando o responsável aceita.
create function public.dcs_notify_task_acceptance()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.accepted_at is not null and new.accepted_at is distinct from old.accepted_at
    and new.created_by is distinct from auth.uid()
    and exists(select 1 from public.profiles p where p.id=new.created_by and p.active)
 then
  insert into public.task_notifications(task_id,recipient_id,assigned_by,kind,title)
  values(new.id,new.created_by,auth.uid(),'accepted',
         left('Aceite confirmado: '||new.title,240));
 end if;
 return new;
end;
$fn$;
create trigger dcs_task_acceptance_notice after update of accepted_at on public.tasks
for each row execute function public.dcs_notify_task_acceptance();

-- Conversa notifica somente os envolvidos que não escreveram a mensagem.
create function public.dcs_notify_task_comment()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 insert into public.task_notifications(task_id,recipient_id,assigned_by,kind,title)
 select t.id,p.id,new.author_id,'comment',
        left('Novo comentário: '||t.title,240)
 from public.tasks t
 join public.profiles p on p.id in (t.created_by,t.assignee_id)
 where t.id=new.task_id and p.active and p.id is distinct from new.author_id
 group by t.id,p.id,t.title;
 return new;
end;
$fn$;
create trigger dcs_task_comment_notice after insert on public.task_comments
for each row execute function public.dcs_notify_task_comment();

-- Lembrete no próprio HUB, uma vez por tarefa/dia, na abertura e nas consultas
-- da sessão autenticada. Não é push, cron, e-mail ou aviso fora da sessão.
create function public.dcs_sync_my_reminders()
returns integer language plpgsql security definer set search_path='' as $fn$
declare me uuid:=auth.uid(); current_day date:=(now() at time zone 'America/Sao_Paulo')::date;
        inserted_count integer;
begin
 if me is null or not public.is_member() then raise exception 'Acesso não autorizado'; end if;
 insert into public.task_notifications
 (task_id,recipient_id,assigned_by,kind,title,reminder_day)
 select t.id,me,null,'reminder',
   left(case when t.due_at < current_day then 'Atrasada: '
             when t.due_at=current_day then 'Vence hoje: '
             else 'Vence amanhã: ' end || t.title,240),current_day
 from public.tasks t
 left join public.events e on e.id=t.event_id
 where t.assignee_id=me
   and t.due_at <= current_day+1
   and t.status not in ('completed','canceled')
   and (t.event_id is null or e.status not in ('completed','canceled'))
 on conflict do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count;
end;
$fn$;

-- Não expor gatilhos internos e RPCs a usuários anônimos.
revoke all on function public.dcs_reset_task_acceptance(),
 public.dcs_notify_task_acceptance(),public.dcs_notify_task_comment()
 from public,anon,authenticated;
revoke all on function public.dcs_accept_task(uuid),
 public.dcs_sync_my_reminders() from public,anon;
grant execute on function public.dcs_accept_task(uuid),
 public.dcs_sync_my_reminders() to authenticated;
commit;
