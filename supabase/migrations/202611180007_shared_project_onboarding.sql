-- DCS HUB · mesmo projeto Supabase que o Autoridades SP, com perfis independentes.
-- Executar APÓS 001-006. NÃO modifica nem remove public.autoridades,
-- public.perfis_usuarios, nem o gatilho existente auth.ao_criar_usuario.
begin;

-- Cadastra a própria conta de Auth no HUB como leitor INATIVO. O login do
-- Autoridades SP não depende desta tabela; nenhum papel é sincronizado.
create function public.dcs_register_profile()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid:=auth.uid(); v_email text;
begin
 if v_id is null then raise exception 'É necessário autenticar-se'; end if;
 select u.email into v_email from auth.users u where u.id=v_id;
 if v_email is null then raise exception 'Conta não encontrada no Auth'; end if;
 insert into public.profiles(id,email,full_name,role,department,active)
 values(v_id,v_email,coalesce(nullif(split_part(v_email,'@',1),''),'Usuário'),
   'reader','DCS',false)
 on conflict(id) do nothing;
end;
$$;
revoke all on function public.dcs_register_profile() from public,anon;
grant execute on function public.dcs_register_profile() to authenticated;

-- Primeiro administrador: exclusivamente alguém que JÁ é administrador
-- no Autoridades SP, e somente quando o HUB ainda não possui admin ativo.
-- Não altera o papel do usuário na aplicação Autoridades SP.
create function public.dcs_claim_initial_admin()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid:=auth.uid(); v_email text;
begin
 if v_id is null then return false; end if;
 -- Bloqueia a disputa pelo primeiro cargo entre logins simultâneos.
 perform pg_advisory_xact_lock(2147483600, 78);
 if exists(select 1 from public.profiles p where p.active and p.role='admin') then
   return false;
 end if;
 if not exists(select 1 from public.perfis_usuarios a
    where a.usuario_id=v_id and a.perfil='administracao') then
   return false;
 end if;
 select u.email into v_email from auth.users u where u.id=v_id;
 if v_email is null then return false; end if;
 insert into public.profiles(id,email,full_name,role,department,active)
 values(v_id,v_email,coalesce(nullif(split_part(v_email,'@',1),''),'Administrador'),
  'admin','DCS',true)
 on conflict(id) do update set role='admin',active=true,department='DCS',
  updated_at=now();
 return true;
end;
$$;
revoke all on function public.dcs_claim_initial_admin() from public,anon;
grant execute on function public.dcs_claim_initial_admin() to authenticated;

-- O catálogo de deputados é consultado DIRETAMENTE em public.autoridades.
-- A migração 006 armazena vínculos pelo ID de origem, não uma cópia da lista.
-- Nada neste script cria trigger ou muda RLS do Autoridades SP.
commit;