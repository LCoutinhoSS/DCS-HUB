-- DCS HUB v0.13: modelos editáveis, conferência do Cerimonial e exportação aprovada.
-- Projeto compartilhado: não altera Autoridades SP, Auth ou anexos institucionais.
begin;

create table public.event_materials (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 kind text not null check (kind in ('roteiro','resumo_reuniao')),
 blocks jsonb not null default '[]'::jsonb,
 version integer not null default 1 check (version>0),
 approved_version integer,
 saved_by uuid not null references public.profiles(id),
 saved_at timestamptz not null default now(),
 approved_by uuid references public.profiles(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 unique(event_id,kind),
 check (approved_version is null or approved_version<=version)
);
create index dcs_event_materials_event_idx on public.event_materials(event_id);
alter table public.event_materials enable row level security;
create policy dcs_materials_member_read on public.event_materials
 for select to authenticated using ((select public.is_member()));
revoke all on public.event_materials from public,anon,authenticated;
grant select on public.event_materials to authenticated;

-- Saída automática segura: texto plano (nunca HTML), com limites de tamanho.
create function public.dcs_save_material(
 p_event uuid,p_kind text,p_blocks jsonb
) returns integer
language plpgsql security definer set search_path='' as $dcs$
declare me uuid:=auth.uid(); v_version integer;
begin
 if me is null or not public.is_editor() then raise exception 'Sem permissão para criar rascunho'; end if;
 if p_kind not in ('roteiro','resumo_reuniao') then raise exception 'Modelo desconhecido'; end if;
 if p_blocks is null or jsonb_typeof(p_blocks)<>'array'
    or jsonb_array_length(p_blocks) not between 2 and 140
    or pg_column_size(p_blocks)>90000
 then raise exception 'Documento inválido ou grande demais'; end if;
 if exists(select 1 from jsonb_array_elements(p_blocks) b
  where jsonb_typeof(b)<>'object' or b->>'kind' is null or b->>'kind' not in
  ('title','subtitle','heading','text','bullet','time','meta','note')
  or jsonb_typeof(b->'text')<>'string'
  or length(b->>'text')>2000)
 then raise exception 'O documento deve conter apenas texto seguro'; end if;
 if not exists (select 1 from public.events e where e.id=p_event and e.status<>'canceled')
 then raise exception 'Evento inexistente ou cancelado'; end if;

 insert into public.event_materials(event_id,kind,blocks,saved_by)
 values(p_event,p_kind,p_blocks,me)
 on conflict(event_id,kind) do update
  set blocks=excluded.blocks,version=public.event_materials.version+1,
      saved_by=excluded.saved_by,saved_at=now()
 returning version into v_version;

 insert into public.event_history(event_id,actor_id,action,details)
 values(p_event,me,'material_draft_saved',jsonb_build_object('kind',p_kind,'version',v_version));
 return v_version;
end;
$dcs$;

-- A aprovação deve ser feita por Cerimonial/Gestor/Admin. Mudanças da origem
-- posteriores ao rascunho exigem que ele seja salvo e revisado de novo.
create function public.dcs_material_is_stale(p_event uuid,p_saved timestamptz)
returns boolean language sql stable security definer set search_path='' as $dcs$
 select exists(select 1 from public.events e where e.id=p_event and e.updated_at>p_saved)
 or exists(select 1 from public.event_briefing_answers a where a.event_id=p_event and a.updated_at>p_saved)
 or exists(select 1 from public.event_participants p where p.event_id=p_event and p.updated_at>p_saved)
 or exists(select 1 from public.event_meetings m where m.event_id=p_event and m.updated_at>p_saved)
$dcs$;

create function public.dcs_approve_material(
 p_event uuid,p_kind text,p_version integer
) returns void
language plpgsql security definer set search_path='' as $dcs$
declare me uuid:=auth.uid(); m public.event_materials%rowtype;
begin
 if me is null or not exists(select 1 from public.profiles p
  where p.id=me and p.active and p.role in ('admin','manager','ceremonial'))
 then raise exception 'Apenas Cerimonial ou Gestor pode aprovar documentos'; end if;
 select * into m from public.event_materials
 where event_id=p_event and kind=p_kind for update;
 if not found then raise exception 'Rascunho não encontrado'; end if;
 if m.version is distinct from p_version then raise exception 'Outra pessoa alterou o rascunho. Atualize a tela'; end if;
 if public.dcs_material_is_stale(p_event,m.saved_at) then
  raise exception 'Informações do evento mudaram desde o rascunho. Revise e salve novamente'; end if;
 update public.event_materials
  set approved_version=m.version,approved_by=me,approved_at=now()
 where id=m.id;
 insert into public.event_history(event_id,actor_id,action,details)
 values(p_event,me,'material_approved',jsonb_build_object('kind',p_kind,'version',m.version));
end;
$dcs$;

-- A API libera a exportação oficial apenas se a aprovação for a versão atual
-- e se o briefing, as pessoas, o evento e as reuniões não tiverem mudado.
create function public.dcs_export_material(p_event uuid,p_kind text)
returns jsonb
language plpgsql stable security definer set search_path='' as $dcs$
declare m public.event_materials%rowtype;
begin
 if auth.uid() is null or not public.is_member() then raise exception 'Acesso negado'; end if;
 select * into m from public.event_materials
 where event_id=p_event and kind=p_kind;
 if not found or m.approved_version is distinct from m.version or m.approved_at is null
 then raise exception 'Documento ainda não aprovado para exportação'; end if;
 if public.dcs_material_is_stale(p_event,m.approved_at) then
  raise exception 'Os dados do evento mudaram. É necessária nova revisão'; end if;
 return m.blocks;
end;
$dcs$;

revoke all on function public.dcs_material_is_stale(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.dcs_save_material(uuid,text,jsonb),
 public.dcs_approve_material(uuid,text,integer),
 public.dcs_export_material(uuid,text) from public,anon;
grant execute on function public.dcs_save_material(uuid,text,jsonb),
 public.dcs_approve_material(uuid,text,integer),
 public.dcs_export_material(uuid,text) to authenticated;
commit;
