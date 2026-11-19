-- DCS HUB v0.14: impedir aprovação de prismas que divergirem dos integrantes confirmados da mesa.
-- Preserva tabelas do Autoridades SP e demais permissões.
begin;
create or replace function public.dcs_approve_material(
 p_event uuid,p_kind text,p_version integer
) returns void
language plpgsql security definer set search_path='' as $dcs$
declare me uuid:=auth.uid(); m public.event_materials%rowtype; v_count integer;
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

 if p_kind='prismas' then
  select count(*) into v_count from public.event_participants p
   where p.event_id=p_event and p.active and p.participation='mesa'
    and p.invitation_status='confirmed';
  if jsonb_array_length(m.blocks)<>(2+3*v_count)
    or m.blocks->0->>'kind' is distinct from 'meta'
    or m.blocks->1->>'kind' is distinct from 'meta'
  then raise exception 'Quantidade ou estrutura de prismas diferente da mesa confirmada. Regere o arquivo'; end if;
  if exists(
   with ordered as (
    select p.full_name,p.role_title,p.honorific,
      (row_number() over (order by p.protocol_order,p.full_name))::int as rn
    from public.event_participants p
    where p.event_id=p_event and p.active and p.participation='mesa'
     and p.invitation_status='confirmed'
   )
   select 1 from ordered p
    where m.blocks->(2+3*(p.rn-1))->>'kind' is distinct from 'heading'
       or m.blocks->(3+3*(p.rn-1))->>'kind' is distinct from 'title'
       or m.blocks->(4+3*(p.rn-1))->>'kind' is distinct from 'text'
       or lower(btrim(m.blocks->(2+3*(p.rn-1))->>'text')) is distinct from lower(btrim(p.honorific))
       or lower(btrim(m.blocks->(3+3*(p.rn-1))->>'text')) is distinct from lower(btrim(p.full_name))
       or lower(btrim(m.blocks->(4+3*(p.rn-1))->>'text')) is distinct from lower(btrim(p.role_title))
  ) then raise exception 'Prismas divergentes dos nomes, cargos e tratamentos aprovados. Atualize a ficha e regenere'; end if;
 end if;

 update public.event_materials
 set approved_version=m.version,approved_by=me,approved_at=now()
 where id=m.id;
 insert into public.event_history(event_id,actor_id,action,details)
 values(p_event,me,'material_approved',jsonb_build_object('kind',p_kind,'version',m.version));
end;
$dcs$;
commit;
