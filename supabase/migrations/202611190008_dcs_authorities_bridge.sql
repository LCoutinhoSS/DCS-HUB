-- DCS HUB | Integração segura com Autoridades SP.
-- A tabela public.autoridades tem RLS para leitura pública,
-- mas seus GRANTs de SELECT foram revogados intencionalmente.
-- NÃO alterar seus GRANTs nem políticas: esta RPC expõe apenas
-- campos autorizados pelo mecanismo existente consultar_autoridades_seguras.
--
-- Requer migrações dcs_hub_001 a 007. Executar no projeto compartilhado.
begin;

create or replace function public.dcs_list_authorities(p_kind text default null)
returns table (
 id text,
 name text,
 kind text,
 role text,
 org text,
 city text,
 partido text,
 email text,
 status_verificacao text,
 updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $dcs$
 select s.id, s.name, s.kind, s.role, s.org, s.city,
        s.partido, s.email, s.status_verificacao, a.updated_at
 from public.consultar_autoridades_seguras() as s
 join public.autoridades as a on a.id = s.id
 where auth.uid() is not null
   and (select public.is_member())
   and (p_kind is null or s.kind = p_kind)
 order by s.name nulls last, s.id
$dcs$;

revoke all on function public.dcs_list_authorities(text) from public, anon;
grant execute on function public.dcs_list_authorities(text) to authenticated;

commit;
