# DCS HUB · v0.4 — operações e administração de usuários

**Projeto de desenvolvimento independente; não modifica nem acessa a produção do Autoridades SP.**

Esta versão parte do HTML do DCS HUB fornecido pelo usuário e preserva o desenho original: navegação, dashboard, agenda mensal e em lista, gestão de eventos, checklist e Kanban. Adiciona um **adaptador opcional Supabase Auth + Postgres** e migrações SQL com **Row Level Security (RLS)**. Sem configuração, a prévia segue usando os dados fictícios em memória; quando o Supabase está configurado, nenhuma informação de demonstração é carregada na sessão real.

## O que funciona

| Área | Sem credenciais (demonstração) | Projeto Supabase configurado |
| --- | --- | --- |
| Login | Seleção de perfil fictício | E-mail/senha pelo Supabase Auth; perfil conferido no banco |
| Agenda e exposições | Em memória | Eventos gravados no banco; intervalos exibidos em todos os dias |
| Aprovação de eventos | Gestor fictício | Apenas perfil manager/admin, verificado no Postgres |
| Modelos e checklists | Em memória | Checklists nascem automaticamente do modelo no momento do cadastro |
| Tarefas e responsáveis | Nomes fictícios | Usuários ativos e tarefas persistidas com UUID |
| Evitar duplicação | Em memória | Constraint UNIQUE + transação na função `approve_event` |
| Reagendamento | Em memória | RPC de reagendamento com motivo no histórico |
| Histórico | Em memória | Geração no banco por gatilhos (triggers) |
| Administração de usuários | Diretório e alterações fictícios | Perfis reais, ativação/desativação e auditoria protegida por RLS |
| Arquivos Microsoft 365 | Não | Somente estrutura de metadados; **sem integração real** |
| Autoridades SP | Não | Somente estrutura de referência; **sem integração real** |

**Importante:** a autenticação Supabase **não é o login Microsoft institucional (SSO)**. O SSO via Microsoft Entra ID depende da autorização da TI e entra em outra etapa. Esta versão é uma base de teste, **não uma aplicação liberada para uso institucional com dados reais**.

## 1. Testar a interface imediatamente (sem instalar nada)

Abra `demo.html` no navegador ou a prévia pública em https://lcoutinhoss.github.io/DCS-HUB/. A interface funciona com informações demonstrativas e credenciais não validadas. Escolha **Gestor** para confirmar eventos ou **Administrador** para testar a gestão de servidores. Os dados somem ao recarregar a página.

## 2. Criar um banco de TESTE separado

1. Crie um **projeto Supabase novo e exclusivo** para o DCS HUB. **Nunca** execute estas migrações no projeto do Autoridades SP.
2. No Supabase, abra **SQL Editor** e execute **na ordem**:
   - `supabase/migrations/202611180001_core.sql`
   - `supabase/migrations/202611180002_templates.sql`
   - `supabase/migrations/202611180003_admin_users.sql`
3. Em **Authentication → Users**, crie manualmente uma conta de teste com e-mail e senha (para ambiente de teste). O gatilho cria em `profiles` uma conta inicialmente `reader` e `active = false`.
4. Faça a liberação inicial dessa conta no SQL Editor, **substituindo** o endereço de exemplo pelo endereço verificado e que você controla:

```sql
update public.profiles
set role = 'admin', active = true, full_name = 'Administrador de teste'
where id = (select id from auth.users where email = 'SEU_EMAIL_DE_TESTE@EXEMPLO.COM')
returning id, email, role, active;
```

**Atenção:** antes de executar, revise a identidade da conta e verifique o resultado. Esse comando é uma etapa administrativa manual, não está embutido no software. Contas posteriores podem ser aprovadas por um administrador autorizado na tela **Administração → Equipe e permissões**. Instruções detalhadas em [docs/ADMINISTRACAO.md](docs/ADMINISTRACAO.md).

5. Para testar os outros perfis, crie contas adicionais no Auth do projeto de testes e use a nova tela **Administração → Gerenciar** para definir `role`, unidade e situação. Os valores de `role` são `admin`, `manager`, `dcs`, `ceremonial`, `reader`.
6. Em **Authentication → Providers**, desabilite cadastro público para evitar criação indiscriminada de contas. Use contas criadas/invitadas pela administração.

### Regras de acesso implementadas no banco

| Perfil | Consultar | Criar atividades e tarefas | Editar tarefas atribuídas ou próprias | Confirmar eventos | Gerenciar perfis |
| --- | --- | --- | --- | --- | --- |
| Administrador | Sim | Sim | Sim | Sim | Sim |
| Gestor | Sim | Sim | Sim, todas | Sim | Não |
| Servidor DCS | Sim | Sim | Sim | Não | Não |
| Servidor Cerimonial | Sim | Sim | Sim | Não | Não |
| Leitor | Sim | Não | Não | Não | Não |

Servidores podem atualizar atividades pendentes que criaram. O gestor/admin pode atualizar qualquer atividade. Só gestor/admin altera status do evento (aprovar, concluir e cancelar). Eventos não são excluídos fisicamente, mas cancelados. A coluna `created_by` é imutável.

## 3. Executar a aplicação com login real

Requer **Node.js 20.19+**, npm e acesso à internet para baixar dependências.

Na pasta do projeto:

```bash
npm install
cp .env.example .env
# Edite o .env com os dados do projeto de TESTE criado no passo 2.
npm run dev
```

No Windows PowerShell, em vez de `cp`, use `Copy-Item .env.example .env`. Abra o endereço local informado pelo Vite (geralmente `http://localhost:5173`).

No arquivo `.env`, preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO-DE-TESTE.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICAVEL_DO_PROJETO_DE_TESTE
```

**Nunca inclua `service_role`, secret key, token Microsoft Graph ou senha no frontend ou `.env` com prefixo `VITE_`.** A chave publishable/anon é pública por definição; a proteção dos dados depende das políticas RLS. `.env` está no `.gitignore`.

Se não houver `.env`, `npm run dev` abre o modo demonstrativo. Depois de configurar, reinicie o servidor Vite para carregar variáveis.

### Usar no dia a dia, em ambiente de teste

1. Entre com a conta de **Servidor Cerimonial** ativa e crie uma exposição de vários dias. Ela é salva como `Pendente` e aparece em todos os dias na agenda.
2. Entre como **Gestor** e confirme. O banco gera uma tarefa por item ainda não concluído do modelo. Confirmar novamente não duplica.
3. Crie tarefas e atribua a outro servidor ativo; ao entrar, esse servidor poderá consultar e atualizar sua tarefa. Os dados permanecem após recarregar.
4. Reagende uma atividade e confira o período e o histórico. Um servidor só pode reagendar atividades pendentes que ele próprio criou; gestores têm acesso mais amplo.
5. Entre como **Leitor** e verifique que não consegue realizar alterações. A proteção está no banco, além da interface.

**Sincronização entre navegadores:** as mudanças já ficam no Postgres, mas a interface só busca novamente os dados no login, em ações realizadas ou ao recarregar a página. Realtime, alertas para outro usuário e assinaturas de calendário estão previstos nas fases seguintes.

## 4. Testes e verificação

```bash
npm test
npm run build
```

`npm test` executa testes de mapeamento, calendário, SQL estático, unicidade de tarefas e sintaxe do script legado. Há uma consulta de auditoria em `supabase/tests_security.sql` para executar no SQL Editor depois das migrações. **Esses testes não substituem testes de segurança/RLS com contas reais**. Valide os cinco perfis em uma base de testes antes de qualquer publicação.

> Nesta entrega, os testes Node foram executados. Não foi possível baixar as dependências npm neste ambiente, nem conectar a um banco Supabase ou concluir o teste de navegador automatizado; o build Vite e as políticas RLS ainda requerem validação end-to-end em sua infraestrutura.

## 5. Build e deploy (após homologação)

Depois da aprovação da TI e dos testes de acesso:

```bash
npm run build
npm run preview
```

O diretório `dist/` é o site estático gerado pelo Vite. Configure variáveis de ambiente para o ambiente correto na hospedagem; a navegação usa `#` e não requer regras de rewrite para URLs de página. Use HTTPS, domínio institucional autorizado, MFA/SSO aprovado, controle de convites e logs. **Não publique a versão de teste como plataforma institucional sem homologação.**

## 6. Arquitetura

```
DCS HUB (HTML/CSS/JS da prévia, preservado)
  └── src/backend.js (adaptador Supabase e ações da interface)
      └── Supabase Auth (usuários)
      └── PostgREST → Postgres (RLS em todas as tabelas)
            ├── profiles (perfil e ativação)
            ├── events → event_checklist → template_items → event_templates
            ├── tasks → events / profiles / event_checklist
            ├── event_history (gatilhos de auditoria)
            ├── documents (referências SharePoint/OneDrive/armazenamento futuro)
            └── event_authorities (IDs externos; sem sincronização)

Microsoft 365 / Outlook / SharePoint / Planner → INATIVO (futura camada Graph)
Autoridades SP → INATIVO (futuro conector somente-leitura)
```

### Observações de segurança e limitações conhecidas

- A autenticação é funcional **somente após** configurar Supabase Auth e aplicar as migrações. Na prévia, não existe validação de senha.
- A tabela `event_history` é somente leitura para os clientes; os gatilhos registram alterações, mas **ainda não há auditoria de todas as operações em documentos/usuários**.
- Tabelas `documents` e `event_authorities` estão preparadas, mas suas telas e fluxos CRUD pertencem às fases posteriores. Nenhuma ligação real ao Autoridades SP foi realizada.
- O feed `.ics` atual é exportação manual e **não** assinatura atualizada automaticamente.
- Não existe envio real de notificações, e-mail, integração Graph ou armazenamento de arquivos nesta etapa.
- A agenda está ajustada ao fuso do navegador do operador; validar suporte a fuso fixo `America/Sao_Paulo` antes de produção.
- Esta primeira camada busca listas inteiras de eventos e tarefas, sujeitas ao limite padrão de retorno da API; paginação e consultas server-side ainda precisam ser adicionadas para uso com grandes volumes.
- Controle de edições simultâneas, backup institucional, retenção, LGPD, políticas de arquivo, MFA/SSO e testes de invasão ainda precisam de homologação.

## Arquivos principais

- `index.html`: interface original com pontos de integração opcionais para Supabase.
- `demo.html`: cópia integral da prévia original, para experimentar sem instalação.
- `src/backend.js`: autenticação real, leitura/gravação, alteração de responsável, aprovação, checklist, reagendamento.
- `src/model.js`: modelo de dados, períodos e conversões para a interface.
- `supabase/migrations/202611180001_core.sql`: esquema, relacionamentos, segurança, RLS, gatilhos, operações atômicas.
- `supabase/migrations/202611180002_templates.sql`: modelos de checklist por categoria.
- `supabase/tests_security.sql`: consulta de conferência de RLS.
- `tests/*.test.js`: testes automatizados de lógica e integridade estática.
- `.env.example`, `.gitignore`, `package.json`: configuração local/segredos e build.

## Próxima etapa proposta

Homologar esta base num Supabase **separado**, testar a tela de **administração de usuários e permissões** com contas distintas, permitir editar dados de eventos e tarefas com validação de campos, e então avançar para documentos e biblioteca SharePoint. Nenhuma alteração será feita na branch `main` do Autoridades SP sem autorização explícita.

---

## 7. Publicar no GitHub sem tocar no Autoridades SP

Para criar o repositório **independente e privado** `dcs-hub`, instalar a CI e, opcionalmente, publicar **somente a prévia demonstrativa** no GitHub Pages, siga [`docs/GITHUB.md`](docs/GITHUB.md). Os arquivos `.github/workflows/ci.yml` e `deploy-demo.yml` estão preparados. O deploy de produção, o Microsoft 365 e o Autoridades SP **não** são ativados por esse procedimento.