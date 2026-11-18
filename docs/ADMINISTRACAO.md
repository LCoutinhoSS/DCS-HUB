# DCS HUB · v0.4 — Administração de usuários

**Homologação apenas.** O GitHub Pages público mostra uma simulação, sem autenticação institucional, pessoas reais ou conexão com Supabase. Não insira dados institucionais na demonstração.

## Funcionalidades

- Painel Administração → Equipe e permissões, com busca, filtros e indicadores de ativos e pendentes.
- Cinco perfis: Administrador, Gestor, Servidor DCS, Servidor Cerimonial e Leitor.
- Administração de contas existentes: nome, setor, perfil, ativação/desativação.
- Modal de cadastro fictício somente na demonstração, sem persistência após recarga.
- Histórico das alterações administrativas, persistido no Supabase quando configurado.
- Não existem convites reais pelo navegador: dependem da configuração do Supabase Auth.

## Migração SQL

**Somente no Supabase NOVO e separado do Autoridades SP**, aplique em sequência:

1. supabase/migrations/202611180001_core.sql
2. supabase/migrations/202611180002_templates.sql
3. supabase/migrations/202611180003_admin_users.sql

A terceira migração remove o UPDATE direto de campos críticos da tabela profiles para contas autenticadas. Expõe a função admin_update_profile apenas para contas autenticadas; internamente exige administrador ativo, recusa alterações no próprio perfil, valida dados e registra alterações em transação única. Cria a tabela profile_admin_audit, protegida com RLS, legível apenas por administradores ativos. Nenhum segredo de serviço é exposto ao navegador.

### Primeiro administrador

1. Em Supabase → Authentication → Users, crie uma conta de homologação de sua titularidade e com e-mail verificado.
2. A migração inicial cria o perfil Leitor / Inativo automaticamente.
3. No SQL Editor administrativo da instância de testes, execute UMA VEZ, com o e-mail verificado da conta que você criou:

```sql
update public.profiles
set role = 'admin', active = true, full_name = 'Administrador de homologação'
where id = (select id from auth.users where email = 'SEU_EMAIL_DE_TESTE@EXEMPLO.COM')
returning id,email,role,active;
```

Confirme que a consulta retornou uma única linha. NÃO execute no projeto Supabase do Autoridades SP.

### Adicionar servidores sem expor credenciais

Pela gestão do Supabase, use Authentication → Users para criar ou convidar as contas autorizadas. O trigger cria perfis inativos. Com sua conta administradora, abra Administração, clique Atualizar e use Gerenciar para definir acesso e ativar a conta. Desabilite cadastros públicos durante a homologação, conforme política da instituição.

### Testes recomendados com contas distintas

1. Conta inativa: login deve ser recusado no HUB.
2. Administrador: ativar uma conta pendente como Servidor Cerimonial.
3. Gestor, Servidor DCS, Servidor Cerimonial e Leitor: nenhum pode alterar perfis; a RPC deve ser negada no banco.
4. Como administrador, alterar setor, perfil e status de outra conta e verificar auditoria.
5. Verificar que o próprio administrador não pode alterar seu próprio perfil.
6. Desativar conta de teste e verificar negação de novas requisições; uma tela já aberta pode manter conteúdo carregado antes.

## Restrições atuais

- SSO Microsoft 365/Entra ID não está integrado.
- Sem automação de convites por e-mail e sem backend que guarde segredos.
- Sem webhook/Realtime: atualizações de terceiros aparecem ao clicar Atualizar.
- GitHub Pages continua com dados fictícios; autenticação real requer uma instância configurada, hospedagem separada e homologação da TI.
- A auditoria desta fase cobre mudanças administrativas de perfil; não é uma solução completa de trilha de auditoria institucional.

## Testes automáticos

O GitHub Actions executa npm test e npm run build. tests/admin.test.js verifica estrutura e restrições estáticas; isso não substitui testes reais de RLS com contas distintas.
