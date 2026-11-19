-- DCS HUB v0.17 — declaração de importação manual no Outlook, sem integração Microsoft.
-- Somente estado mínimo e auditoria; não tocar em Autoridades SP nem em eventos existentes.
begin;

create table public.event_calendar_imports (
  event_id uuid primary key references public.events(id) on delete cascade,
  imported_at timestamptz not null default now(),
  imported_by uuid not null references public.profiles(id),
  calendar_label text not null default '' check (length(btrim(calendar_label)) <= 100),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object')
);
create index event_calendar_imports_imported_at_idx
  on public.event_calendar_imports(imported_at desc);
alter table public.event_calendar_imports enable row level security;
create policy event_calendar_imports_read on public.event_calendar_imports
  for select to authenticated using ((select public.is_member()));
revoke all on public.event_calendar_imports from public, anon, authenticated;
grant select on public.event_calendar_imports to authenticated;

create function public.dcs_set_calendar_manual_import(
  p_event uuid, p_imported boolean, p_calendar_label text, p_expected jsonb
) returns void
language plpgsql security definer set search_path = '' as $dcs$
declare
  me uuid := auth.uid();
  ev public.events%rowtype;
  current_snapshot jsonb;
  old_import public.event_calendar_imports%rowtype;
begin
  if me is null or not public.is_editor() then
    raise exception 'Apenas servidores autorizados podem registrar importações';
  end if;
  if p_event is null or p_imported is null then
    raise exception 'Dados obrigatórios não informados';
  end if;

  select * into ev from public.events e where e.id = p_event for update;
  if not found then raise exception 'Evento não encontrado'; end if;

  current_snapshot := jsonb_build_object(
    'title', ev.title,
    'starts_ms', (extract(epoch from ev.start_at) * 1000)::bigint,
    'ends_ms', (extract(epoch from ev.end_at) * 1000)::bigint,
    'location', coalesce(nullif(ev.location, ''), 'A definir')
  );

  if p_imported then
    if ev.status not in ('confirmed', 'completed') then
      raise exception 'Somente eventos confirmados ou concluídos podem ser registrados como importados';
    end if;
    if p_expected is distinct from current_snapshot then
      raise exception 'O evento foi alterado desde a visualização. Atualize antes de registrar';
    end if;
    if length(btrim(coalesce(p_calendar_label, ''))) > 100 then
      raise exception 'Nome de calendário muito longo';
    end if;

    insert into public.event_calendar_imports
      (event_id, imported_at, imported_by, calendar_label, snapshot)
    values
      (p_event, now(), me, btrim(coalesce(p_calendar_label, '')), current_snapshot)
    on conflict (event_id) do update
    set imported_at = excluded.imported_at,
        imported_by = excluded.imported_by,
        calendar_label = excluded.calendar_label,
        snapshot = excluded.snapshot;

    insert into public.event_history(event_id, actor_id, action, details)
    values (p_event, me, 'calendar_manual_import_recorded',
      jsonb_build_object('calendar_label', btrim(coalesce(p_calendar_label,'')),
                         'manual_confirmation', true));
  else
    delete from public.event_calendar_imports i
      where i.event_id = p_event
      returning i.* into old_import;
    if found then
      insert into public.event_history(event_id, actor_id, action, details)
      values (p_event, me, 'calendar_manual_import_cleared',
        jsonb_build_object('calendar_label', old_import.calendar_label));
    end if;
  end if;
end;
$dcs$;

revoke all on function public.dcs_set_calendar_manual_import(uuid,boolean,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.dcs_set_calendar_manual_import(uuid,boolean,text,jsonb)
  to authenticated;

commit;
