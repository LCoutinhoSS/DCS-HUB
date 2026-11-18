# DCS HUB 0.5 · Central de Documentos e Conhecimento

> **Em homologação.** A versão pública do GitHub Pages tem somente dados fictícios em memória. Não possui integração Microsoft Graph, armazenamento de arquivos, SSO ou autenticação institucional. Não cadastre informações sensíveis na demonstração pública.

## Entregue nesta fase

1. **Central de Documentos**: catálogo filtrável por tipo (roteiro, nominata, modelo, convite, briefing, referência) e origem (SharePoint / OneDrive). Busca por nome, tags e evento.
2. **Referências externas**: cadastro, edição e exclusão de links HTTPS do SharePoint e OneDrive. O HUB não copia arquivos, não altera suas permissões e não simula conexão Microsoft 365.
3. **Vínculos**: cada referência pode apontar para um evento e/ou tarefa. A aba **Documentos** de cada evento mostra os itens associados e permite vincular novos.
4. **Wiki DCS**: consulta, busca, criação, atualização e exclusão de artigos, com resumo, área, tags, vínculo ao evento e estados *rascunho/publicado*.
5. **Histórico de versões**: cada inserção ou alteração de artigo cria uma revisão no banco. Somente autor e gestores podem consultar versões, pois revisões podem conter textos que já não são públicos para leitores.
6. **Controle de acesso**: perfil Leitor somente consulta; gestores e autores podem editar seus documentos e artigos; políticas RLS asseguram o comportamento no Postgres.
7. **Sem conteúdos institucionais inventados**: os itens de demonstração são explicitamente marcados como EXEMPLO e não têm URLs falsos ou arquivos inexistentes.

## Como testar no site

Acesse https://lcoutinhoss.github.io/DCS-HUB/ e entre com o perfil **Administrador**, sem e-mail ou senha (apenas na demonstração). Use **Documentos** para explorar o acervo, **Wiki DCS** para ler ou editar artigos e **Gestão de eventos → escolha um evento → Documentos** para visualizar os vínculos.

Em modo demonstrativo, você pode adicionar seus próprios dados à sessão, mas **não cole links internos, credenciais nem documentos pessoais**. A página é pública e o modo de teste não fornece proteção de acesso. As alterações desaparecem ao recarregar.

Para verificar as permissões da interface, saia, entre como **Leitor** e abra Documentos e Wiki. A criação/edição fica indisponível; rascunhos que não pertencem ao usuário não são exibidos.

## Ativação no Supabase separado do Autoridades SP

Execute as migrações na ordem:

- `supabase/migrations/202611180001_core.sql`
- `supabase/migrations/202611180002_templates.sql`
- `supabase/migrations/202611180003_admin_users.sql`
- `supabase/migrations/202611180004_knowledge.sql`

A 004 amplia a tabela existente `documents` com descrição e tags e cria `knowledge_articles` e `knowledge_article_revisions`. Todos os artigos e revisões têm políticas de Row Level Security. As versões são escritas por trigger e não diretamente pelo cliente.

No desenvolvimento local: configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` num arquivo `.env` **não versionado**, depois execute `npm install`, `npm test` e `npm run dev`. Nunca coloque service_role/secret keys em arquivos de frontend.

Contas reais devem ser criadas no Supabase Auth e liberadas pelo Administrador do HUB. O modo Supabase não carrega os documentos e artigos demonstrativos.

## Limites desta versão

- O suporte a documentos **é por referência**. Não existe upload de arquivo local, criação automática de pasta, visualização embutida nem compartilhamento via Microsoft Graph.
- O acesso aos arquivos externos continua sujeito às permissões de SharePoint/OneDrive, independentemente do acesso ao índice do HUB.
- O registro de revisões não faz restauração automática. O usuário autorizado pode consultar versões anteriores e editar o artigo manualmente.
- O índice de referências não equivale a um sistema de gestão documental formal nem substitui a política de retenção e LGPD institucional.
- O GitHub Pages permanece demonstrativo; publicação de dados reais precisa de backend separado, controles de autenticação e autorização institucional.

## Próxima etapa

**0.6 — Fluxos documentais e modelos operacionais:** aprovação de documentos, modelos por tipo de evento, anexação segura via armazenamento privado do HUB em ambiente homologado e preparação do seletor Microsoft 365. Planejar a integração com SharePoint após liberação de escopos mínimos pelo Entra ID/TI, sem alterar o Autoridades SP.
