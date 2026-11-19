# DCS HUB — Central de Comunicação Social / Cerimonial (homologação)

Sistema web para agenda, eventos, checklist operacional, gestão de tarefas, equipes **DCS e Cerimonial**, documentos, matérias em formato editorial e administração de usuários.

## Acessos

- **[Demonstração pública](https://lcoutinhoss.github.io/DCS-HUB/):** dados e senhas fictícios apenas no navegador. Use para conhecer a interface; não insira dados reais.
- **[Homologação com login Supabase](https://lcoutinhoss.github.io/DCS-HUB/homologacao/):** usa as contas já existentes do Supabase do **Autoridades SP**, mas tem **permissões, registros e tabelas próprias**. O primeiro administrador do HUB deve ser um administrador já autorizado no Autoridades SP; as demais contas aguardam aprovação. Inicialmente use apenas dados fictícios.

## Status — 18 de novembro de 2026

As migrações 001–007 foram **aplicadas e verificadas** no projeto Supabase existente `BUSCA AUTORIDADE`. O Autoridades SP preservou 150 registros de autoridades e 6 perfis; o HUB começou com 20 espaços ALESP e **nenhum evento ou perfil DCS criado automaticamente**. As tabelas DCS usam RLS.

O cadastro de **94 deputados estaduais** da aplicação Autoridades SP é consultado pela função restrita `dcs_list_authorities`, usada também pela área **Autoridades SP**. Ela respeita as regras de mascaramento existentes e não duplica nem edita a tabela original. Novos solicitantes (órgãos, setores, outros) são armazenados em `public.event_requesters`. O evento registra o vínculo à fonte e o nome de referência na data do cadastro.

> **Atenção:** a validação automatizada de SQL, permissões e frontend não substitui testes com duas contas reais e revisão da TI. E-mail, Outlook, Planner, SSO institucional e reserva automática de espaços **não estão integrados**. A homologação é acessível pela internet e requer login, não sendo um ambiente aprovado para informações confidenciais.


**Correção de acesso — 19/11/2026:** no Autoridades SP, a tabela `public.autoridades` tem RLS de leitura, mas não concede `SELECT` direto ao papel `authenticated`. Isso causava `permission denied for table autoridades` na homologação. A migração **008** instalou a função `dcs_list_authorities`, restrita a membros ativos do HUB, que reutiliza `consultar_autoridades_seguras()` e devolve somente campos públicos/autorizados. A UI de **Autoridades SP** e o seletor de **Solicitantes** passaram a usar essa função. Os testes com perfil ativo retornaram 150 registros (94 deputados); sem perfil DCS, zero. Nenhuma permissão da tabela original foi modificada.

## Recursos

| Recurso | Demonstração | Homologação Supabase |
| --- | --- | --- |
| Login | Contas fictícias públicas | E-mail/senha real, perfil DCS inativo até aprovação |
| Autoridades | Relação fictícia inicial | Consulta à tabela original `public.autoridades` |
| Solicitantes | Busca, inclusão e edição fictícias | Deputados da base Autoridades SP + outros solicitantes administráveis |
| Agenda, eventos e reuniões | Temporários | Persistidos no banco e compartilhados |
| Espaços ALESP | 20 opções iniciais | Catálogo no banco e edição por administrador |
| Checklists | Modelos de cinco planilhas ALESP | Checklist persistente, fases e delegação para usuários ativos |
| Tarefas/notificações | Simulação na mesma aba | Tarefas por UUID e aviso interno por usuário (sem e-mail) |
| Equipes | DCS e Cerimonial fictícios | Perfis e vínculos por equipe |
| Wiki DCS | Matérias, capa, fotos e versões fictícias | Artigos no banco; fotos em bucket privado |
| Administração | Perfis fictícios | Admin libera perfis DCS sem mudar permissões do Autoridades SP |

A seleção de um espaço da ALESP **não é uma reserva** e a confirmação de um evento no HUB não substitui autorização institucional.

## Estrutura e implantação

- `index.html` e `demo.html` — aplicações e interface pública.
- `src/boot.js` — inicia login real apenas com `VITE_DCS_MODE=homologacao`, sem fallback para contas fictícias.
- `src/backend.js`, `src/model.js` — cliente Supabase, eventos, tarefas, Auth, administração.
- `src/requesters.js`, `src/venues.js`, `src/teams.js`, `src/eventflow.js`, `src/checklist-models.js` — fluxos operacionais.
- `src/knowledge.js`, `src/admin.js` — revista interna, documentos e perfis.
- `supabase/migrations/202611180001_*.sql` a `202611180007_*.sql` — **já aplicadas**, não executar novamente.
- `supabase/migrations/202611190008_dcs_authorities_bridge.sql` — **já aplicada**; consulta protegida para o HUB, sem conceder SELECT direto à tabela original.
- `.github/workflows/build-homologacao.yml` — compila o login real com **chave publicável**, publica exclusivamente o caminho `/homologacao/`; o site raiz continua sendo demonstração.
- `.github/workflows/ci.yml` — testes e build.

## Segurança e boas práticas

O projeto usa o **mesmo Supabase e Auth** do Autoridades SP, com isolamento **lógico**, não físico. Não foram alterados `public.autoridades`, `public.perfis_usuarios`, regras existentes ou o gatilho de novos usuários do Autoridades SP. O login permite autenticação pela conta existente; acesso ao HUB exige perfil próprio em `public.profiles`. A chave publishable pode estar no frontend, mas **nunca** divulgar chaves secretas nem senhas.

Os Supabase Advisors identificaram avisos anteriores de funções `SECURITY DEFINER` públicas no Autoridades SP e outros pontos de segurança. Eles precisam ser revisados em conjunto, sem mudanças bruscas que interrompam a aplicação existente. Antes de dados institucionais, validar também políticas de retenção, LGPD, auditoria, aprovação TI e alternativas de SSO/MFA.

**Leia também:**
- [Banco compartilhado e primeiro login](docs/BANCO_COMPARTILHADO.md)
- [Guia dos eventos e checklists](docs/OPERACOES_08.md)
- [Manual de Administração](docs/ADMINISTRACAO.md)
- [Acesso demonstrativo](docs/ACESSO_PROTOTIPO.md)
