-- DCS HUB v0.15: ordem manual atômica, conflito por atualização e trilha de auditoria.
-- Não altera a base de dados do Autoridades SP.
create function public.dcs_reorder_event_mesa(
 p_event uuid,p_participant_ids uuid[],p_expected jsonb
) returns integer language plpgsql security definer set search_path='' as $dcs$
declare me uuid:=auth.uid(); v_status text; v_count integer; v_changed integer;
  v_old jsonb; v_new jsonb;
begin
 if me is null or not public.is_editor() then
  raise exception 'Sem permissão para organizar a mesa';
 end if;
 if p_participant_ids is null or cardinality(p_participant_ids)<1 or cardinality(p_participant_ids)>99
    or (select count(distinct id) from unnest(p_participant_ids) x(id))<>cardinality(p_participant_ids)
    or coalesce(jsonb_typeof(p_expected),'')<>'object'
 then raise exception 'Lista da mesa inválida'; end if;
 -- Serializa reorganizações simultâneas do mesmo evento.
 select status into v_status from public.events where id=p_event for update;
 if not found then raise exception 'Evento não encontrado'; end if;
 if v_status in ('completed','canceled') then
  raise exception 'Evento encerrado. Mesa somente para leitura';
 end if;
 -- Bloqueia edições dos participantes existentes enquanto valida e atualiza.
 perform 1 from public.event_participants p
 where p.event_id=p_event and p.active and p.participation='mesa'
   and p.invitation_status<>'declined' order by p.id for update;

 select count(*) into v_count from public.event_participants p
 where p.event_id=p_event and p.active and p.participation='mesa'
   and p.invitation_status<>'declined';
 if v_count<>cardinality(p_participant_ids) or exists(
  select 1 from unnest(p_participant_ids) x(id)
  left join public.event_participants p on p.id=x.id
    and p.event_id=p_event and p.active and p.participation='mesa'
    and p.invitation_status<>'declined'
  where p.id is null
 ) then raise exception 'A composição da mesa mudou. Atualize a tela'; end if;
 if exists(
  select 1 from public.event_participants p
  where p.event_id=p_event and p.active and p.participation='mesa'
    and p.invitation_status<>'declined'
    and (not (p_expected ? p.id::text)
      or p.updated_at is distinct from ((p_expected->>p.id::text)::timestamptz))
 ) then raise exception 'Outra pessoa alterou a mesa. Atualize a tela e reorganize novamente'; end if;

 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'ordem',p.protocol_order)
    order by p.protocol_order nulls last,p.full_name),'[]'::jsonb)
 into v_old from public.event_participants p
 where p.event_id=p_event and p.active and p.participation='mesa' and p.invitation_status<>'declined';
 update public.event_participants p set protocol_order=x.ord::integer
 from unnest(p_participant_ids) with ordinality x(id,ord)
 where p.id=x.id and p.event_id=p_event and p.protocol_order is distinct from x.ord::integer;
 get diagnostics v_changed=row_count;
 if v_changed>0 then
  select jsonb_agg(jsonb_build_object('id',x.id,'ordem',x.ord) order by x.ord)
  into v_new from unnest(p_participant_ids) with ordinality x(id,ord);
  insert into public.event_history(event_id,actor_id,action,details)
  values(p_event,me,'mesa_reordered',jsonb_build_object(
    'antes',v_old,'depois',v_new,'participantes',v_count));
 end if;
 return v_changed;
end;
$dcs$;
revoke all on function public.dcs_reorder_event_mesa(uuid,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.dcs_reorder_event_mesa(uuid,uuid[],jsonb) to authenticated;
