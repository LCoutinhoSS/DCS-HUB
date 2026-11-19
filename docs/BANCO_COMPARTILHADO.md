# DCS HUB + Autoridades SP — Instância compartilhada de Supabase

**Atualizado em 18/11/2026.** O usuário autorizou aproveitar o banco já existente. O projeto Supabase conectado é `BUSCA AUTORIDADE`; nesta instância, foram aplicadas, com sucesso, as oito migrações DCS HUB (`dcs_hub_001_core` a `dcs_hub_008_authorities_secure_bridge`).

## Arquitetura realmente implementada

| Elemento | Autoridades SP | DCS HUB |
| --- | --- | --- |
| Projeto Supabase / Auth | Compartilhado | Compartilhado |
| Cadastro de autoridades | `public.autoridades` é fonte principal | **Consulta somente leitura** aos deputados estaduais dessa tabela |
| Permissões de login | `public.perfis_usuarios` | `public.profiles` (independente) |
| Eventos e tarefas | Não alterados | `public.events`, `public.event_checklist`, `public.tasks` |
| Espaços ALESP | Não alterados | `public.venues` |
| Solicitantes adicionais | Não alterados | `public.event_requesters` — só setores/órgãos/outros |
| Documentos e matérias | Não alterados | `public.documents`, `public.knowledge_articles` |
| Notificações | Não alteradas | `public.task_notifications` |

Os nomes das tabelas DCS são exclusivos e verificados no banco. **Não** criamos um segundo trigger em `auth.users`: o trigger já existente do Autoridades SP continua operando como antes. Nenhuma alteração foi aplicada nas estruturas `public.autoridades` ou `public.perfis_usuarios`.

### Dados verificados após aplicação

- Autoridades SP: **150 autoridades**, sendo **94 deputados estaduais**, e **6 perfis**.
- DCS HUB: **20 espaços ALESP**; nenhum evento, perfil DCS ou solicitante extra criado automaticamente.
- As sete migrações constam no histórico do Supabase e as tabelas DCS verificadas estão com RLS habilitada.

A consulta a deputados reflete a tabela de origem sem cópia: atualizações no Autoridades SP aparecem na lista DCS após recarregar. Os eventos guardam ID de origem e **snapshot do nome** utilizado no momento do pedido, para não perder o histórico ao mudar um nome.

## Correção de permissões e integração — 19/11/2026

**Erro encontrado:** `permission denied for table autoridades` na página de homologação. A tabela original `public.autoridades` tem uma política RLS de leitura, mas o papel `authenticated` não tinha `GRANT SELECT`. Essa arquitetura é intencional para proteger os campos restritos do Autoridades SP.

**Solução aplicada:** migração `202611190008_dcs_authorities_bridge.sql`, que cria a RPC `public.dcs_list_authorities(p_kind)`. A função exige `auth.uid()` e `public.is_member()` (perfil DCS ativo), invoca a consulta existente `consultar_autoridades_seguras()` para respeitar os campos e alterações manuais autorizados pelo Autoridades SP e devolve somente ID, nome, categoria, cargo, órgão, município, partido, e-mail, status de verificação e data de atualização. Não retorna telefones restritos ou observações internas.

**Uso:** tanto a página **Autoridades SP** quanto o campo **Solicitante** dos eventos usam a mesma RPC: sem `p_kind` traz todas as autoridades; com `p_kind='deputado_estadual'` traz os deputados. A tabela `autoridades` permanece sem permissão SQL de leitura direta para `authenticated` e `anon`; a RPC só pode ser executada pelo papel `authenticated` e verifica o perfil DCS internamente.

**Testes no banco:** perfil DCS ativo → 150 autoridades, 94 deputados; filtro de deputados → 94; usuário sem perfil DCS → zero; execução RPC por `anon` → negada. A tabela original segue com 150 registros e 6 perfis do Autoridades SP.

## Onde entrar

**Protótipo público, sem dados reais:** https://lcoutinhoss.github.io/DCS-HUB/

**Homologação com Supabase Auth:** https://lcoutinhoss.github.io/DCS-HUB/homologacao/

A segunda página é gerada por workflow do GitHub que compila o frontend com `VITE_DCS_MODE=homologacao` e a **chave publicável** do Supabase. Ela usa a mesma autenticação do Autoridades SP. A chave publicável não concede privilégios administrativos; o controle de acesso depende das políticas RLS no banco.

Se a rota /homologacao não abrir imediatamente, conferir o workflow **pages build and deployment** do GitHub Pages. Publicar a página não comprova que o login de uma pessoa foi testado de ponta a ponta.

## Primeiro administrador e demais servidores

1. Entre na rota **/homologacao/** usando **a própria conta Supabase de acesso ao Autoridades SP**, se já tiver uma. Não utilize as contas `@demo.dcs-hub.invalid` nem a senha de demonstração.
2. O login busca seu perfil em `public.profiles`. Se não existir, a função `dcs_register_profile` cria um perfil do HUB como `reader` e **inativo**, sem mexer no papel da outra aplicação.
3. A primeira pessoa que já tiver o perfil `administracao` em **`public.perfis_usuarios`** pode assumir a primeira administração do DCS HUB pela função `dcs_claim_initial_admin`. A concessão é atômica e não altera o Autoridades SP.
4. Todos os demais usuários permanecem **pendentes** até o Administrador do HUB ativá-los e definir nome, papel (**Administrador, Gestor, Servidor DCS, Servidor Cerimonial ou Leitor**) e equipe (**DCS ou Cerimonial**) no módulo **Administração**.
5. Contas futuras podem ser criadas pelo Supabase Auth, passando inicialmente pelo papel de usuário comum do Autoridades SP e pelo papel inativo do DCS HUB. **Cadastrar um usuário não o torna automaticamente membro do HUB.**

O fluxo foi inspecionado e as funções foram instaladas, mas **não há credenciais de usuário disponíveis para executar um login interativo real nesta conversa**. Testar com dois usuários reais autorizados é a etapa seguinte.

## Segurança, limitações e pendências

- Nenhuma permissão `anon` foi adicionada às tabelas DCS. Teste direto com o papel `anon` confirmou **permission denied** ao tentar ler `public.profiles`.
- O banco já possuía avisos de segurança no Supabase Advisor, incluindo funções `SECURITY DEFINER` acessíveis sem login para o site de autoridades. **Não foram alteradas** para não quebrar o Autoridades SP. Revisar antes de colocar dados sensíveis no HUB: [Guia oficial para funções expostas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- As funções administrativas DCS usam verificações explícitas de `auth.uid()` e de papel ativo. O frontend não utiliza nenhuma chave `service_role` ou `sb_secret_`.
- Autenticação por senha existe, mas MFA, SSO Microsoft 365, integração Outlook/Planner e autorizações de reserva de espaços ainda não estão implementados.
- A rota de homologação é acessível pela internet e exige login antes de carregar dados internos. **A homologação deve usar apenas dados fictícios**, até revisão da TI e um teste real de permissões entre contas.
- Uma única instância Supabase significa compartilhamento de capacidade, logs, faturamento e domínio de Auth. O isolamento é **lógico (tabelas, perfis e RLS)**, não físico. Futuramente é possível migrar o HUB para outro projeto sem perder o desenho lógico.

## Limpeza dos testes

A opção **Restaurar demonstração** da versão pública NÃO apaga o Supabase compartilhado. Na homologação, dados inseridos ficam persistidos. Antes de uma futura limpeza, confirmar o alvo e obter backup; apagar **somente** registros de eventos, tarefas, checklists, notificações, matérias e documentos do HUB, e contas/perfis de ensaio especificamente identificados. **Nunca** executar TRUNCATE ou DELETE em `public.autoridades`, `public.perfis_usuarios`, `auth.users` nem nas outras tabelas do Autoridades SP sem plano de migração e confirmação expressa.
