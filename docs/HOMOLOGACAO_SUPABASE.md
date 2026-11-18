# DCS HUB — Homologação com Supabase Auth

> **Estado em 18/11/2026:** preparação do código concluída; **ainda não foi criado um banco exclusivo**. O único projeto conectado no Supabase continua sendo **BUSCA AUTORIDADE** (na organização **AUTORIDADES SP**) e NÃO deve receber as migrações do DCS HUB.

## Separação obrigatória de ambientes

- **Demonstração pública:** https://lcoutinhoss.github.io/DCS-HUB/ — contas e dados fictícios, sem sincronização entre computadores. Nenhuma informação institucional interna deve ser inserida ali.
- **Homologação real:** um projeto Supabase **novo**, com Auth e banco próprios, e um build Vite com `VITE_DCS_MODE=homologacao`. **Quando a URL ou chave pública estiverem ausentes, o login é bloqueado**, sem cair nas contas fictícias.
- **Produção institucional:** outro ambiente, a ser autorizado pela TI, depois dos testes. Evite reutilizar dados de ensaio ou criar usuários reais no projeto público de demonstração.

## Organização e eventual custo

Antes de criar o banco, confirmar em qual organização do Supabase ele ficará. A conta conectada mostra apenas a organização **AUTORIDADES SP**. Um segundo projeto na mesma organização terá banco e autenticação **independentes**, mas ficará sob a administração e faturamento dessa organização. A criação pode ter custo: consultar o valor com o Supabase e obter autorização expressa caso não seja zero.

Região inicialmente planejada: **South America (São Paulo, sa-east-1)**, sujeita à confirmação de disponibilidade e política institucional.

## Migrações em ordem — somente no banco DCS HUB

1. `supabase/migrations/202611180001_core.sql`
2. `supabase/migrations/202611180002_templates.sql`
3. `supabase/migrations/202611180003_admin_users.sql`
4. `supabase/migrations/202611180004_knowledge.sql`
5. `supabase/migrations/202611180005_venues_teams_editorial.sql`
6. `supabase/migrations/202611180006_requesters_eventflow.sql`

Antes de habilitar uso pela equipe, testar a criação de conta, perfil inativo, RLS e funções administrativas com usuários distintos; depois executar os Supabase Advisors de segurança e desempenho. **Não usar** o banco do projeto Autoridades SP.

## Como funciona o login real

1. Criar contas de ensaio pelo **Supabase Authentication**, com e-mail válido e fluxo de recuperação/senha conforme a política da TI.
2. O gatilho cria automaticamente um perfil `reader`, `active=false`; uma nova conta não se torna administradora sozinha.
3. Promover a **primeira conta de homologação** por operação administrativa restrita, depois administrar as demais pelo módulo Administração.
4. A interface usa `supabase.auth.signInWithPassword()`. Os dados do usuário são vinculados a seu UUID; autorizações são checadas no banco com RLS.
5. A opção **Você** em tarefa agora é convertida para o UUID da própria sessão, em vez de ser tratada como um nome textual.
6. O logout invalida a sessão e limpa eventos, tarefas, notificações e caches de solicitantes/espaços do navegador.
7. Não publicar `service_role`, `sb_secret_*`, tokens ou senhas no GitHub.

## Variáveis públicas do build

Crie um arquivo `.env` **local e ignorado pelo Git**, conforme `.env.example`:

```dotenv
VITE_DCS_MODE=homologacao
VITE_SUPABASE_URL=https://SEU-PROJETO-DCS.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_CHAVE_PUBLICA
```

Essas variáveis **não** são credenciais administrativas, mas a publicação da aplicação continua exigindo RLS seguro. O build da prévia GitHub Pages da branch `main` ainda é **demonstrativo**; a implantação do build de homologação e sua URL são tarefas posteriores à criação do projeto novo.

## Testes que precisam passar antes da apresentação multiusuário

- Conta sem autorização / perfil inativo não entra no HUB.
- Servidor DCS não pode alterar permissões administrativas; Cerimonial vê suas tarefas atribuídas.
- Gestor confirma evento e delegação cria notificação **somente** na conta correta, verificando acesso com dois navegadores diferentes.
- Excluir/alterar matrícula administrativa de outra pessoa sem permissão deve falhar no banco.
- Dados sensíveis não podem ser consultados como `anon`, inclusive bucket de mídia.
- Reunião, checklist e anexos permanecem após atualização de página e são consistentes entre dois computadores.
- Separação de organizações, banco e IDs: nenhuma chamada ou migração aponta para `BUSCA AUTORIDADE`.

## Limpeza futura dos testes

Prefira **um projeto de homologação isolado**, para ensaios com dados fictícios, e um futuro projeto de produção que começa vazio de ensaios. Nunca executar uma exclusão indiscriminada na instância com dados reais. Excluir contas de teste e dados de demonstração apenas depois de conferir o alvo, registrar backup e obter autorização para a limpeza.
