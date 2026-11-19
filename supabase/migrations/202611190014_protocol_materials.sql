-- DCS HUB v0.14: campos de protocolo e materiais de mesa.
-- Não altera tabelas do Autoridades SP e não copia artes oficiais.
begin;
alter table public.event_participants
 add column honorific text not null default '' check(length(honorific)<=110),
 add column protocol_order integer check(protocol_order between 1 and 99),
 add column represented_for text not null default '' check(length(represented_for)<=180);
grant update(honorific,protocol_order,represented_for) on public.event_participants to authenticated;

alter table public.event_materials drop constraint event_materials_kind_check;
alter table public.event_materials add constraint event_materials_kind_check
 check (kind in ('roteiro','resumo_reuniao','nominata','prismas'));

create or replace function public.dcs_save_material(
 p_event uuid,p_kind text,p_blocks jsonb
) returns integer
language plpgsql security definer set search_path='' as $dcs$
declare me uuid:=auth.uid(); v_version integer;
begin
 if me is null or not public.is_editor() then raise exception 'Sem permissão para criar rascunho'; end if;
 if p_kind not in ('roteiro','resumo_reuniao','nominata','prismas')
 then raise exception 'Modelo desconhecido'; end if;
 if not public.dcs_valid_material_blocks(p_blocks) then
  raise exception 'Documento inválido: tipo, texto ou tamanho incorreto';
 end if;
 if not exists(select 1 from public.events e where e.id=p_event and e.status<>'canceled')
 then raise exception 'Evento inexistente ou cancelado'; end if;

 insert into public.event_materials(event_id,kind,blocks,saved_by)
 values(p_event,p_kind,p_blocks,me)
 on conflict(event_id,kind) do update
 set blocks=excluded.blocks,
     version=public.event_materials.version+1,
     saved_by=excluded.saved_by,saved_at=now()
 returning version into v_version;
 insert into public.event_history(event_id,actor_id,action,details)
 values(p_event,me,'material_draft_saved',jsonb_build_object('kind',p_kind,'version',v_version));
 return v_version;
end;
$dcs$;

create or replace function public.dcs_approve_material(
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
 if m.version is distinct from p_version then
  raise exception 'Outra pessoa alterou o rascunho. Atualize a tela'; end if;
 if public.dcs_material_is_stale(p_event,m.saved_at) then
  raise exception 'Informações do evento mudaram desde o rascunho. Revise e salve novamente'; end if;

 if p_kind in ('nominata','prismas') then
  if not exists(select 1 from public.event_participants p where p.event_id=p_event
    and p.active and p.participation='mesa' and p.invitation_status='confirmed')
  then raise exception 'Registre pelo menos uma pessoa confirmada na mesa'; end if;
  if exists(select 1 from public.event_participants p where p.event_id=p_event
    and p.active and p.participation='mesa' and p.invitation_status not in ('confirmed','declined'))
  then raise exception 'Existem lugares da mesa ainda a confirmar. Revise presenças'; end if;
  if exists(select 1 from public.event_participants p where p.event_id=p_event
    and p.active and p.participation='mesa' and p.invitation_status='confirmed'
    and (p.protocol_order is null or btrim(p.role_title)='' or btrim(p.honorific)=''))
  then raise exception 'Informe ordem, tratamento e cargo de todos os integrantes confirmados da mesa'; end if;
  if exists(select 1 from public.event_participants p where p.event_id=p_event
    and p.active and p.participation='mesa' and p.invitation_status='confirmed'
    group by p.protocol_order having count(*)>1)
  then raise exception 'Há posições repetidas na ordem da mesa'; end if;
 end if;

 update public.event_materials
 set approved_version=m.version,approved_by=me,approved_at=now()
 where id=m.id;
 insert into public.event_history(event_id,actor_id,action,details)
 values(p_event,me,'material_approved',jsonb_build_object('kind',p_kind,'version',m.version));
end;
$dcs$;
commit;