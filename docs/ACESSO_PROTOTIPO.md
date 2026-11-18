# Acesso ao DCS HUB — Apresentação 0.6

## Dois modos distintos

**1. GitHub Pages / DEMONSTRAÇÃO — acessível agora**

URL: https://lcoutinhoss.github.io/DCS-HUB/

Essa página está pública e carrega **somente dados fictícios**. Ela exige e-mail e uma senha demonstrativa para apresentar um fluxo de entrada, mas essa verificação ocorre no próprio navegador. **Ela não autentica usuários reais nem protege dados confidenciais**. Qualquer pessoa pode visualizar a senha e as contas no código-fonte público. Não cole senhas reais, nomes de servidores, documentos, links internos, dados pessoais, eventos não públicos ou informações administrativas.

Contas de apresentação:

| Perfil | E-mail de demonstração |
|---|---|
| Administrador | admin@demo.dcs-hub.invalid |
| Gestor | gestor@demo.dcs-hub.invalid |
| Servidor DCS | dcs@demo.dcs-hub.invalid |
| Servidor Cerimonial | cerimonial@demo.dcs-hub.invalid |
| Leitor | leitor@demo.dcs-hub.invalid |

Senha **idêntica e pública para todas as contas fictícias**: **DCSdemo2026!**

Na tela inicial, selecione a conta de treinamento. O campo de e-mail é preenchido automaticamente; insira a senha demonstrativa e clique em **Entrar**. O perfil escolhe as telas e controles da prévia. A sessão de apresentação é mantida somente naquela aba, com validade máxima de oito horas. Recarregar a aba mantém a identidade, mas reinicia dados criados em memória.

### Como limpar os testes da apresentação

Entre como **Administrador** e use o botão **Restaurar demonstração** que aparece na navegação lateral. Confirme a mensagem: o aplicativo descarta as alterações fictícias daquela aba e retorna ao acervo de exemplos. Isso **não** apaga contas ou registros no Supabase, GitHub ou Microsoft 365, pois o site público não está conectado a esses serviços. Faça a restauração em cada navegador utilizado.

Cada navegador trabalha com dados de treinamento independentes. A demonstração **não sincroniza** as alterações feitas entre dois computadores.

**Não remova as migrações, testes automatizados ou o código-fonte ao encerrar a apresentação.** O comando limpa apenas os registros fictícios da sessão.

**2. Supabase Auth / LOGIN REAL — configurável depois da criação do projeto isolado**

O repositório mantém a autenticação por e-mail/senha via Supabase Auth, com perfis no Postgres e Row Level Security. Este fluxo real **não está ativo no GitHub Pages**. Para usá-lo:

1. Criar projeto Supabase novo e exclusivo para o DCS HUB, sem reaproveitar o banco do Autoridades SP;
2. Executar, nessa ordem, as migrações SQL **001_core**, **002_templates**, **003_admin_users**, **004_knowledge** no SQL Editor do novo projeto;
3. Criar conta de teste em **Authentication → Users**; ativar o primeiro administrador uma única vez seguindo a documentação [ADMINISTRACAO.md](ADMINISTRACAO.md);
4. Configurar localmente as variáveis públicas **VITE_SUPABASE_URL** e **VITE_SUPABASE_ANON_KEY** a partir de .env.example. Nunca compartilhar service_role, JWT secret ou senhas;
5. Instalar dependências e executar **npm run dev** num ambiente de homologação e testar login, negação de perfil inativo e políticas RLS com contas distintas;
6. Usar uma hospedagem de testes separada com configuração de build para o frontend. Não habilitar dados institucionais no site público sem avaliação e autorização da TI.

O login real e a versão fictícia não devem compartilhar contas nem dados. No build configurado com Supabase, a interface esconde o seletor de perfis fictícios e exige credenciais validadas pelo provedor. A sessão real é governada pelo Supabase Auth e pelas permissões no banco.

## Antes de iniciar o uso institucional

Solicitar à TI homologação do ambiente, MFA/SSO Entra ID quando permitido, políticas de retenção, auditoria e autorização de acesso aos documentos da ALESP. O protótipo não substitui esses controles.
