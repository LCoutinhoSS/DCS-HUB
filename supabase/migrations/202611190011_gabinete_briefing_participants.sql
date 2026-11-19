-- DCS HUB v0.11: respostas do gabinete e pessoas vinculadas ao evento.
-- Não altera registros/permissões da tabela original Autoridades SP.
begin;

create table public.event_briefing_answers (
 event_id uuid not null references public.events(id) on delete cascade,
 question_key text not null check(question_key ~ '^[a-z][a-z0-9_]{2,63}$'),
 answer text not null default '' check(length(answer)<=3000),
 status text not null default 'pending' check(status in ('pending','confirmed','to_confirm','not_applicable')),
 updated_by uuid references public.profiles(id),
 updated_at timestamptz not null default now(),
 primary key(event_id,question_key)
);
create index event_briefing_answers_updated_idx on public.event_briefing_answers(updated_at desc);
alter table public.event_briefing_answers enable row level security;
create policy event_briefing_answers_read on public.event_briefing_answers
for select to authenticated using ((select public.is_member()));
revoke all on public.event_briefing_answers from public,anon,authenticated;
grant select on public.event_briefing_answers to authenticated;

-- Grava uma resposta sem depender do criador original: equipe autorizada pode
-- complementar a ficha posteriormente, mantendo autor e data em banco.
create function public.dcs_save_event_briefing(
 p_event uuid,p_key text,p_answer text,p_status text
) returns void language plpgsql security definer set search_path='' as $dcs$
declare me uuid := auth.uid(); ev_status text; v_changed boolean;
begin
 if me is null or not public.is_editor() then
  raise exception 'Sem permissão para alterar o briefing';
 end if;
 if p_key is null or p_key !~ '^[a-z][a-z0-9_]{2,63}$'
    or length(coalesce(p_answer,''))>3000 or p_status not in
       ('pending','confirmed','to_confirm','not_applicable')
 then raise exception 'Resposta inválida'; end if;
 select status into ev_status from public.events where id=p_event for update;
 if not found then raise exception 'Evento inexistente'; end if;
 if ev_status in ('completed','canceled') then
  raise exception 'Evento encerrado. Ficha disponível apenas para leitura'; end if;
 insert into public.event_briefing_answers(event_id,question_key,answer,status,updated_by,updated_at)
 values(p_event,p_key,btrim(coalesce(p_answer,'')),p_status,me,now())
 on conflict(event_id,question_key) do update
 set answer=excluded.answer,status=excluded.status,updated_by=me,updated_at=now();
 insert into public.event_history(event_id,actor_id,action,details)
 values(p_event,me,'briefing_answer_saved',jsonb_build_object('question_key',p_key,'status',p_status));
end;
$dcs$;
revoke all on function public.dcs_save_event_briefing(uuid,text,text,text) from public,anon;
grant execute on function public.dcs_save_event_briefing(uuid,text,text,text) to authenticated;

create table public.event_participants (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 authority_id text references public.autoridades(id) on delete set null,
 full_name text not null check(length(btrim(full_name)) between 2 and 200),
 role_title text not null default '' check(length(role_title)<=180),
 organization text not null default '' check(length(organization)<=180),
 participation text not null default 'convidado' check(participation in
 ('mesa','fala','homenageado','palestrante','convidado','comitiva','outro')),
 invitation_status text not null default 'to_confirm' check(invitation_status in
 ('to_confirm','invited','confirmed','declined')),
 notes text not null default '' check(length(notes)<=1000),
 active boolean not null default true,
 created_by uuid not null references public.profiles(id),
 updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index event_participants_event_idx on public.event_participants(event_id,active,participation);
alter table public.event_participants enable row level security;
create policy event_participants_read on public.event_participants
for select to authenticated using ((select public.is_member()));
create policy event_participants_insert on public.event_participants
for insert to authenticated with check (
 (select public.is_editor()) and created_by=(select auth.uid()) and updated_by=(select auth.uid())
);
create policy event_participants_update on public.event_participants
for update to authenticated using ((select public.is_editor()))
with check ((select public.is_editor()));
revoke all on public.event_participants from public,anon,authenticated;
grant select,insert on public.event_participants to authenticated;
grant update(full_name,role_title,organization,participation,invitation_status,notes,active,authority_id)
 on public.event_participants to authenticated;

-- Regras do banco impedem alterações depois de encerrado e preservam a autoria.
create function public.dcs_guard_event_participant()
returns trigger language plpgsql set search_path='' as $dcs$
declare event_status text;
begin
 if tg_op='UPDATE' and
    (new.event_id is distinct from old.event_id or new.created_by is distinct from old.created_by)
 then raise exception 'Evento/autoria não podem ser alterados'; end if;
 select status into event_status from public.events where id=new.event_id;
 if not found or event_status in ('completed','canceled') then
   raise exception 'Evento encerrado ou inexistente'; end if;
 if not public.is_editor() then raise exception 'Sem permissão de edição'; end if;
 if tg_op='INSERT' then
  new.created_by:=auth.uid();
 end if;
 new.updated_by:=auth.uid();
 new.updated_at:=now();
 return new;
end;
$dcs$;
create trigger dcs_guard_event_participant_data before insert or update
on public.event_participants for each row execute function public.dcs_guard_event_participant();

create function public.dcs_log_event_participant()
returns trigger language plpgsql security definer set search_path='' as $dcs$
begin
 insert into public.event_history(event_id,actor_id,action,details)
 values(new.event_id,auth.uid(),'event_participant_updated',
 jsonb_build_object('participant_id',new.id,'participation',new.participation,
 'invitation_status',new.invitation_status));
 return new;
end;
$dcs$;
create trigger dcs_event_participant_history after insert or update
on public.event_participants for each row execute function public.dcs_log_event_participant();

revoke all on function public.dcs_guard_event_participant(),
 public.dcs_log_event_participant() from public,anon,authenticated;
commit;