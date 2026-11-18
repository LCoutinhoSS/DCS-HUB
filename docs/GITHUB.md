# GitHub — nova instalação independente do DCS HUB

## Segurança e escopo

- **Nome proposto:** `dcs-hub`; **visibilidade recomendada:** **privado**.
- Não use o repositório `autoridades-sp`. O HUB é projeto separado.
- Nunca commit `.env`, `service_role`, Graph tokens, chaves privadas ou senhas.
- A CI testa e compila o código sem conexões institucionais. **Não executa migrações automaticamente.**
- Nenhuma implantação de produção está habilitada por padrão.

## Como criar no GitHub

1. Logado no GitHub, abra `https://github.com/new`.
2. Proprietário: sua conta; nome: `dcs-hub`; descrição: `Central Inteligente de Operações — DCS HUB`.
3. Selecione **Private**. Deixe **README, .gitignore e licença desmarcados** (o pacote já tem arquivos).
4. Clique em **Create repository**.
5. Carregue os arquivos deste diretório com Git (método abaixo) ou informe que o repositório foi criado para envio pela conexão GitHub.

## Primeiro envio via Git no computador

Execute estes comandos **dentro da pasta do projeto** (não dentro do ZIP). Requer Git e autenticação no GitHub do seu computador.

```bash
git init -b main
git add .
git commit -m "feat: DCS HUB v0.3 base visual, Supabase e CI"
git remote add origin https://github.com/SEU_USUARIO/dcs-hub.git
git push -u origin main
```

Em `SEU_USUARIO`, utilize seu login do GitHub. **Nunca cole token pessoal no chat nem no comando remoto.** A autenticação deve ocorrer pelo gerenciador de credenciais do Git/GitHub.

## CI automática

O arquivo `.github/workflows/ci.yml` executa testes (`npm test`) e build (`npm run build`) em pushes/PRs para `main`. Consulte a guia **Actions** depois do primeiro envio. Sem `package-lock.json` (o ambiente de geração não pôde baixar dependências), o fluxo usa `npm install`, não `npm ci`. Gere e versione o lockfile em ambiente com acesso npm assim que possível.

## Prévia visual no GitHub Pages — opcional e manual

O workflow `.github/workflows/deploy-demo.yml` publica **somente** `demo.html` como página inicial, sem configuração Supabase ou dados reais. É intencionalmente `workflow_dispatch`, isto é, **não publica ao fazer push**.

Se quiser publicar a DEMO:

1. Confirme que a divulgação da interface fictícia é permitida pela instituição.
2. Em **Settings → Pages**, use **Source: GitHub Actions** (se permitido pelo plano e pelas permissões do repositório).
3. Em **Actions → Publicar somente DEMO no GitHub Pages → Run workflow**, acione manualmente.
4. Veja o endereço resultante na execução do workflow ou em **Settings → Pages**.

**Observação:** GitHub Pages pode ter limitações em repositórios privados dependendo do plano; nunca mude para público apenas para contornar uma restrição institucional. A DEMO tem seleção de perfis e senha fictícia, sem backend nem dados reais. Não é sistema de login seguro.

## Backend e autenticação reais

Crie **outro projeto Supabase**, exclusivo do HUB, e leia o `README.md`. Execute as migrações no projeto novo e conceda acesso apenas a contas de teste. Configure `.env` somente em ambiente local. A hospedagem com login real requer uma revisão de segurança, homologação e um destino aprovado; **a ação de demo não implementa backend**.
