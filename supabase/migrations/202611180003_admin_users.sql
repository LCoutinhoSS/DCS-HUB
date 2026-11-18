-- DCS HUB v0.4 | Gestão de usuários (aplicar APÓS 202611180002_templates.sql).
-- Esta migração só atua no projeto Supabase próprio do DCS HUB.
-- Jamais publique service_role, segredos ou dados institucionais neste repositório.

begin;

create table if not exists public.profile_admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  target_id uuid not null references public.profiles(id),
  target_name text not null,
  old_role text not null,
  new_role text not null,
  old_active boolean not null,
  new_active boolean not null,
  old_department text not null,
  new_department text not null,
  old_name text not null,
  new_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists profile_admin_audit_recent_idx on public.profile_admin_audit (created_at desc);

alter table public.profile_admin_audit enable row level security;
create policy profile_admin_audit_read on public.profile_admin_audit
for select to authenticated using ((select public.is_admin()));

revoke all on public.profile_admin_audit from public,anon,authenticated;
grant select on public.profile_admin_audit to authenticated;

-- Elimina atualização direta de perfis: alterações apenas pela função atômica e auditável.
revoke update(role,department,active,full_name) on table public.profiles from authenticated;

create function public.admin_update_profile(
  p_profile_id uuid,
  p_full_name text,
  p_role text,
  p_department text,
  p_active boolean
) returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.profiles%rowtype;
  v_new public.profiles%rowtype;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores ativos podem gerenciar perfis';
  end if;

  if p_profile_id is null or p_profile_id = auth.uid() then
    raise exception 'Não é permitido modificar o próprio perfil administrativo';
  end if;

  v_name := btrim(coalesce(p_full_name,''));
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Nome completo deve conter entre 2 e 120 caracteres';
  end if;
  if p_role is null or p_role not in ('admin','manager','dcs','ceremonial','reader') then
    raise exception 'Perfil inválido';
  end if;
  if p_department is null or p_department not in ('DCS','Cerimonial') then
    raise exception 'Unidade inválida';
  end if;
  if p_active is null then
    raise exception 'Situação obrigatória';
  end if;

  select * into v_old from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  if v_old.role = 'admin' and v_old.active and (p_role <> 'admin' or not p_active) then
    -- A própria conta administrativa não pode ser alterada por ela mesma;
    -- esta verificação adicional documenta e protege o último administrador.
    if (select count(*) from public.profiles where active and role = 'admin' and id <> p_profile_id) < 1 then
      raise exception 'É obrigatório manter pelo menos um administrador ativo';
    end if;
  end if;

  update public.profiles
    set full_name=v_name, role=p_role, department=p_department, active=p_active
    where id=p_profile_id
    returning * into v_new;

  if row(v_old.full_name,v_old.role,v_old.department,v_old.active)
     is distinct from row(v_new.full_name,v_new.role,v_new.department,v_new.active) then
    insert into public.profile_admin_audit
      (actor_id,target_id,target_name,old_role,new_role,old_active,new_active,
       old_department,new_department,old_name,new_name)
    values
      (auth.uid(),p_profile_id,v_new.full_name,v_old.role,v_new.role,v_old.active,v_new.active,
       v_old.department,v_new.department,v_old.full_name,v_new.full_name);
  end if;

  return v_new;
end;
$$;

revoke all on function public.admin_update_profile(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.admin_update_profile(uuid,text,text,text,boolean) to authenticated;

commit;
