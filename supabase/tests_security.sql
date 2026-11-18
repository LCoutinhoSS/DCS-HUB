-- Checklist de integridade executável no SQL Editor de um projeto de TESTES
-- APÓS executar as migrações. Apenas SELECT: não altera dados.
select c.relname as tabela, c.relrowsecurity as rls_ativo
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
('profiles','event_templates','template_items','events','event_checklist','tasks','documents','event_authorities','event_history')
order by c.relname;

select tablename,policyname,cmd,roles,qual,with_check
from pg_policies where schemaname='public' and tablename in
('profiles','event_templates','template_items','events','event_checklist','tasks','documents','event_authorities','event_history')
order by tablename,policyname;

-- Verifique manualmente: 9 tabelas com rls_ativo=true; sem política de gravação em event_history.
